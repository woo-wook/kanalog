import XCTest

final class KanalogUITests: XCTestCase {
    private var recordingFailure = false

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    override func record(_ issue: XCTIssue) {
        if !recordingFailure {
            recordingFailure = true
            let app = XCUIApplication()
            if app.state == .runningForeground || app.state == .runningBackground {
                let tree = XCTAttachment(string: app.debugDescription)
                tree.name = "Failure accessibility tree"
                tree.lifetime = .keepAlways
                add(tree)
                let screenshot = XCTAttachment(screenshot: app.screenshot())
                screenshot.name = "Failure screenshot"
                screenshot.lifetime = .keepAlways
                add(screenshot)
            }
            recordingFailure = false
        }
        super.record(issue)
    }

    private func scrollUntilHittable(_ element: XCUIElement, in app: XCUIApplication, maximumDrags: Int = 12) {
        let area: XCUIElement
        if app.collectionViews.firstMatch.exists { area = app.collectionViews.firstMatch }
        else if app.tables.firstMatch.exists { area = app.tables.firstMatch }
        else if app.scrollViews.firstMatch.exists { area = app.scrollViews.firstMatch }
        else { area = app }
        for _ in 0..<maximumDrags {
            if element.exists && element.isHittable { return }
            // Move a short distance, checking after every drag so a target cannot be skipped.
            let from = area.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.72))
            let to = area.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.52))
            from.press(forDuration: 0.1, thenDragTo: to)
        }
        XCTAssertTrue(element.exists, "Requested control was not found after \(maximumDrags) short scrolls")
        XCTAssertTrue(element.isHittable, "Requested control remained outside the viewport after \(maximumDrags) short scrolls")
    }

    func testOfflineKanaRevealRateAndPersistedSettings() {
        let app = XCUIApplication()
        app.launchArguments = ["--public-content-only"]
        app.launch()
        XCTAssertTrue(app.navigationBars["Kanalog"].waitForExistence(timeout: 30))
        let katakana = app.switches["kana.katakana"]
        XCTAssertTrue(katakana.waitForExistence(timeout: 5))
        XCTAssertEqual(katakana.value as? String, "0")
        katakana.tap()
        XCTAssertEqual(katakana.value as? String, "1", "Katakana must be selected before verifying the combined count")
        let practice = app.buttons["kana.practice.start"]
        scrollUntilHittable(practice, in: app)
        XCTAssertEqual(practice.label, "선택한 208자 연습", "Both scripts and all four groups must contain 208 kana")
        XCTAssertTrue(practice.isEnabled)
        practice.tap()
        let reveal = app.buttons["study.reveal"]
        XCTAssertTrue(reveal.waitForExistence(timeout: 10))
        reveal.tap()
        let good = app.buttons["study.rating.3"]
        XCTAssertTrue(good.waitForExistence(timeout: 5))
        good.tap()
        XCTAssertTrue(reveal.waitForExistence(timeout: 10))
        app.buttons["study.close"].tap()
        app.tabBars.buttons["설정"].tap()
        let hangul = app.switches["settings.hangul"]
        XCTAssertTrue(hangul.waitForExistence(timeout: 5))
        let before = hangul.value as? String
        hangul.tap()
        let after = hangul.value as? String
        XCTAssertNotEqual(before, after)
        let save = app.buttons["settings.save"]
        scrollUntilHittable(save, in: app)
        XCTAssertTrue(save.isEnabled)
        save.tap()
        let saved = app.descendants(matching: .any)["settings.saved"]
        scrollUntilHittable(saved, in: app)
        XCTAssertTrue(saved.waitForExistence(timeout: 10))
        app.terminate(); app.launch()
        XCTAssertTrue(app.navigationBars["Kanalog"].waitForExistence(timeout: 30))
        app.tabBars.buttons["설정"].tap()
        XCTAssertEqual(app.switches["settings.hangul"].value as? String, after)
    }
}
