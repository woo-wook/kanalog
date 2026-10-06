// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "KanalogCore",
    platforms: [.macOS(.v13), .iOS(.v17)],
    products: [.library(name: "KanalogCore", targets: ["KanalogCore"])],
    dependencies: [.package(url: "https://github.com/open-spaced-repetition/swift-fsrs.git", revision: "4fbaf20184d62f82a9f44f343337c61a2c5483e9")],
    targets: [
        .target(name: "KanalogCore", dependencies: [.product(name: "FSRS", package: "swift-fsrs")]),
        .testTarget(name: "KanalogCoreTests", dependencies: ["KanalogCore", .product(name: "FSRS", package: "swift-fsrs")]),
    ]
)
