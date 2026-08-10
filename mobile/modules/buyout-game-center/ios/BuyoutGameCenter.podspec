Pod::Spec.new do |s|
  s.name           = 'BuyoutGameCenter'
  s.version        = '1.0.0'
  s.summary        = 'Game Center bindings for Buyout'
  s.description    = 'GameKit auth, leaderboards, and achievements for Buyout.'
  s.author         = 'Jordan Yeats'
  s.homepage       = 'https://github.com/jordanyeats/Buyout'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
