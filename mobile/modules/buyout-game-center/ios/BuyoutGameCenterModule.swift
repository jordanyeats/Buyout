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
  private var authResolved = false

  private func rootViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    for scene in scenes {
      if let root = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController {
        var top = root
        while let presented = top.presentedViewController { top = presented }
        return top
      }
    }
    return nil
  }

  public func definition() -> ModuleDefinition {
    Name("BuyoutGameCenter")

    /// Resolves true once the local player is authenticated, false if the
    /// player declined or auth failed. Presents the sign-in sheet if needed.
    AsyncFunction("authenticate") { (promise: Promise) in
      DispatchQueue.main.async {
        let player = GKLocalPlayer.local
        if player.isAuthenticated {
          promise.resolve(true)
          return
        }
        self.authResolved = false
        player.authenticateHandler = { [weak self] viewController, error in
          guard let self = self else { return }
          if let vc = viewController {
            self.rootViewController()?.present(vc, animated: true)
            return // handler fires again after the sheet completes
          }
          if !self.authResolved {
            self.authResolved = true
            promise.resolve(player.isAuthenticated)
          }
        }
      }
    }

    Function("isAuthenticated") { () -> Bool in
      return GKLocalPlayer.local.isAuthenticated
    }

    Function("playerAlias") { () -> String? in
      let p = GKLocalPlayer.local
      return p.isAuthenticated ? p.alias : nil
    }

    /// Submit a score to a leaderboard. No-op when signed out.
    AsyncFunction("submitScore") { (leaderboardId: String, value: Int, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.resolve(false)
        return
      }
      GKLeaderboard.submitScore(
        value, context: 0, player: GKLocalPlayer.local,
        leaderboardIDs: [leaderboardId]
      ) { error in
        promise.resolve(error == nil)
      }
    }

    /// Report an achievement at a completion percentage (0-100). No-op when signed out.
    AsyncFunction("reportAchievement") { (achievementId: String, percent: Double, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.resolve(false)
        return
      }
      let achievement = GKAchievement(identifier: achievementId)
      achievement.percentComplete = min(100.0, max(0.0, percent))
      achievement.showsCompletionBanner = true
      GKAchievement.report([achievement]) { error in
        promise.resolve(error == nil)
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
