import ExpoModulesCore
import GameKit

/// Keeps the GKGameCenterViewController delegate alive while it is presented.
private class GameCenterDismisser: NSObject, GKGameCenterControllerDelegate {
  static let shared = GameCenterDismisser()
  func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
    gameCenterViewController.dismiss(animated: true)
  }
}

public class BuyoutGameCenterModule: Module {
  /// Set exactly once, as early as possible — Apple's guidance, and the reason
  /// the previous build never signed in: the handler was installed from a JS
  /// call during the first React render, when there was often no window to
  /// present the sign-in sheet from. When presentation failed the handler never
  /// fired again, so its promise never resolved and sign-in hung forever.
  private var handlerInstalled = false
  private var lastAuthError: String?
  /// Sheet we could not present yet because no window was ready.
  private var pendingAuthVC: UIViewController?

  private func rootViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .filter { $0.activationState == .foregroundActive || $0.activationState == .foregroundInactive }
    for scene in scenes {
      let window = scene.windows.first(where: { $0.isKeyWindow }) ?? scene.windows.first
      if let root = window?.rootViewController {
        var top = root
        while let presented = top.presentedViewController { top = presented }
        return top
      }
    }
    return nil
  }

  /// Present a view controller, retrying on later runloop turns while the
  /// window hierarchy is still coming up. Gives up after ~5s.
  private func present(_ vc: UIViewController, attempt: Int = 0) {
    if let root = rootViewController(), root.view.window != nil {
      pendingAuthVC = nil
      root.present(vc, animated: true)
      return
    }
    guard attempt < 25 else {
      pendingAuthVC = nil
      lastAuthError = "No window was available to present the Game Center sign-in sheet."
      sendAuthState()
      return
    }
    pendingAuthVC = vc
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
      self?.present(vc, attempt: attempt + 1)
    }
  }

  private func sendAuthState() {
    let p = GKLocalPlayer.local
    sendEvent(
      "onAuthChange",
      [
        "authenticated": p.isAuthenticated,
        "alias": p.isAuthenticated ? p.alias : nil,
        "error": lastAuthError as Any,
      ]
    )
  }

  private func installHandlerIfNeeded() {
    guard !handlerInstalled else { return }
    handlerInstalled = true
    GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
      guard let self = self else { return }
      if let error = error {
        self.lastAuthError = error.localizedDescription
      } else if GKLocalPlayer.local.isAuthenticated {
        self.lastAuthError = nil
      }
      if let vc = viewController {
        // iOS wants us to show the sign-in sheet. The handler fires again once
        // the player finishes with it.
        self.present(vc)
        return
      }
      self.sendAuthState()
    }
  }

  public func definition() -> ModuleDefinition {
    Name("BuyoutGameCenter")

    Events("onAuthChange")

    /// Installs the authenticate handler. Safe to call repeatedly; the handler
    /// is only ever set once. Auth results arrive on the onAuthChange event
    /// rather than a promise, so a sheet that takes a minute — or never gets
    /// presented — cannot strand the caller.
    Function("startAuthentication") { () -> Bool in
      DispatchQueue.main.async { self.installHandlerIfNeeded() }
      return GKLocalPlayer.local.isAuthenticated
    }

    Function("isAuthenticated") { () -> Bool in
      return GKLocalPlayer.local.isAuthenticated
    }

    Function("playerAlias") { () -> String? in
      let p = GKLocalPlayer.local
      return p.isAuthenticated ? p.alias : nil
    }

    Function("lastError") { () -> String? in
      return self.lastAuthError
    }

    /// Submit a score. Resolves a description of what happened rather than a
    /// bare Bool, so a misconfigured leaderboard ID is visible instead of silent.
    AsyncFunction("submitScore") { (leaderboardId: String, value: Int, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.resolve(["ok": false, "error": "Not signed in to Game Center."])
        return
      }
      GKLeaderboard.submitScore(
        value, context: 0, player: GKLocalPlayer.local,
        leaderboardIDs: [leaderboardId]
      ) { error in
        if let error = error {
          promise.resolve(["ok": false, "error": error.localizedDescription])
        } else {
          promise.resolve(["ok": true])
        }
      }
    }

    /// Report an achievement at a completion percentage (0-100).
    AsyncFunction("reportAchievement") { (achievementId: String, percent: Double, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.resolve(["ok": false, "error": "Not signed in to Game Center."])
        return
      }
      let achievement = GKAchievement(identifier: achievementId)
      achievement.percentComplete = min(100.0, max(0.0, percent))
      achievement.showsCompletionBanner = true
      GKAchievement.report([achievement]) { error in
        if let error = error {
          promise.resolve(["ok": false, "error": error.localizedDescription])
        } else {
          promise.resolve(["ok": true])
        }
      }
    }

    /// Ask Game Center which of these IDs it actually knows about. This is the
    /// difference between "our code is broken" and "App Store Connect does not
    /// have these IDs" — the two are indistinguishable from the submit path.
    AsyncFunction("diagnose") { (leaderboardIds: [String], achievementIds: [String], promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.resolve([
          "signedIn": false,
          "error": self.lastAuthError ?? "Not signed in to Game Center.",
        ])
        return
      }
      GKLeaderboard.loadLeaderboards(IDs: leaderboardIds) { boards, lbError in
        let foundBoards = (boards ?? []).map { $0.baseLeaderboardID }
        GKAchievementDescription.loadAchievementDescriptions { descriptions, achError in
          let known = Set((descriptions ?? []).map { $0.identifier })
          promise.resolve([
            "signedIn": true,
            "alias": GKLocalPlayer.local.alias,
            "leaderboardsFound": foundBoards,
            "leaderboardsMissing": leaderboardIds.filter { !foundBoards.contains($0) },
            "achievementsFound": achievementIds.filter { known.contains($0) },
            "achievementsMissing": achievementIds.filter { !known.contains($0) },
            "leaderboardError": lbError?.localizedDescription as Any,
            "achievementError": achError?.localizedDescription as Any,
          ])
        }
      }
    }

    /// Present the Game Center overlay (leaderboards tab).
    AsyncFunction("showGameCenter") { (promise: Promise) in
      DispatchQueue.main.async {
        guard GKLocalPlayer.local.isAuthenticated else {
          promise.resolve(false)
          return
        }
        let vc = GKGameCenterViewController(state: .leaderboards)
        vc.gameCenterDelegate = GameCenterDismisser.shared
        self.rootViewController()?.present(vc, animated: true)
        promise.resolve(true)
      }
    }
  }
}
