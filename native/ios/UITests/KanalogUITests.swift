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

    private func stage(_ name: String) {
        print("KANALOG_UI stage=\(name)")
    }

    private func scrollArea(in app: XCUIApplication) -> XCUIElement {
        if app.collectionViews.firstMatch.exists { return app.collectionViews.firstMatch }
        if app.tables.firstMatch.exists { return app.tables.firstMatch }
        if app.scrollViews.firstMatch.exists { return app.scrollViews.firstMatch }
        return app
    }

    private func diagnostics(_ element: XCUIElement, identifier: String, app: XCUIApplication, area: XCUIElement) -> String {
        let exists = element.exists
        let label = exists ? String(element.label.replacingOccurrences(of: "\n", with: " ").prefix(200)) : "<missing>"
        let frame = exists ? element.frame : CGRect.null
        return "identifier=\(identifier) exists=\(exists) label=\(label) frame=\(frame) scrollArea.frame=\(area.frame) app.frame=\(app.frame)"
    }

    private func visible(_ element: XCUIElement, app: XCUIApplication, area: XCUIElement) -> Bool {
        guard element.exists else { return false }
        let viewport = app.frame.intersection(area.frame)
        let intersection = element.frame.intersection(viewport)
        return !intersection.isNull && intersection.width > 0 && intersection.height > 0
    }

    private func scroll(_ element: XCUIElement, identifier: String, in app: XCUIApplication, interactive: Bool, maximumDrags: Int = 12) {
        let area = scrollArea(in: app)
        for attempt in 0..<maximumDrags {
            if visible(element, app: app, area: area) && (!interactive || element.isHittable) { return }
            print("KANALOG_UI stage=scroll attempt=\(attempt + 1) interactive=\(interactive) \(diagnostics(element, identifier: identifier, app: app, area: area))")
            let appFrame = app.frame
            let safe = appFrame.intersection(area.frame).insetBy(dx: 8, dy: 24)
            guard !safe.isNull, safe.width > 0, safe.height >= 48 else {
                XCTFail("No safe scroll viewport. \(diagnostics(element, identifier: identifier, app: app, area: area))")
                return
            }
            // Form's accessibility frame may extend beyond the screen. Gesture coordinates
            // come from the app viewport (64% -> 42%), clamped to its visible scrolling area.
            let x = min(max(appFrame.midX, safe.minX), safe.maxX)
            let targetIsAbove = element.exists && element.frame.midY < appFrame.minY + appFrame.height * 0.22
            let fromFraction = targetIsAbove ? 0.42 : 0.64
            let toFraction = targetIsAbove ? 0.64 : 0.42
            let fromY = min(max(appFrame.minY + appFrame.height * fromFraction, safe.minY), safe.maxY)
            let toY = min(max(appFrame.minY + appFrame.height * toFraction, safe.minY), safe.maxY)
            let origin = app.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0))
            let from = origin.withOffset(CGVector(dx: x - appFrame.minX, dy: fromY - appFrame.minY))
            let to = origin.withOffset(CGVector(dx: x - appFrame.minX, dy: toY - appFrame.minY))
            from.press(forDuration: 0.1, thenDragTo: to)
        }
        let details = diagnostics(element, identifier: identifier, app: app, area: area)
        XCTAssertTrue(element.exists, "Requested control was not found after \(maximumDrags) short scrolls. \(details)")
        XCTAssertTrue(visible(element, app: app, area: area), "Requested element remained outside the viewport after \(maximumDrags) short scrolls. \(details)")
        if interactive { XCTAssertTrue(element.isHittable, "Requested button remained untappable after \(maximumDrags) short scrolls. \(details)") }
    }

    private func tapSwitch(_ element: XCUIElement, expecting value: String) {
        XCTAssertTrue(element.isHittable)
        // Form can expose the whole labeled row as a switch; tap its trailing switch track.
        element.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
        let changed = expectation(for: NSPredicate(format: "value == %@", value), evaluatedWith: element)
        wait(for: [changed], timeout: 5)
        XCTAssertEqual(element.value as? String, value)
    }

    func testOfflineKanaRevealRateAndPersistedSettings() {
        let app = XCUIApplication()
        app.launchArguments = ["--public-content-only"]
        stage("launch")
        app.launch()
        XCTAssertTrue(app.navigationBars["Kanalog"].waitForExistence(timeout: 30))
        stage("kana.select.katakana")
        let katakana = app.switches["kana.katakana"]
        XCTAssertTrue(katakana.waitForExistence(timeout: 5))
        XCTAssertEqual(katakana.value as? String, "0")
        tapSwitch(katakana, expecting: "1")
        XCTAssertEqual(katakana.value as? String, "1", "Katakana must be selected before verifying the combined count")
        stage("kana.practice.scroll")
        let practice = app.buttons["kana.practice.start"]
        scroll(practice, identifier: "kana.practice.start", in: app, interactive: true)
        XCTAssertEqual(practice.label, "선택한 208자 연습", "Both scripts and all four groups must contain 208 kana")
        XCTAssertTrue(practice.isEnabled)
        stage("kana.practice.start")
        practice.tap()
        let reveal = app.buttons["study.reveal"]
        XCTAssertTrue(reveal.waitForExistence(timeout: 10))
        stage("study.reveal")
        reveal.tap()
        let good = app.buttons["study.rating.3"]
        XCTAssertTrue(good.waitForExistence(timeout: 5))
        stage("study.rate.good")
        good.tap()
        XCTAssertTrue(reveal.waitForExistence(timeout: 10))
        stage("study.close")
        app.buttons["study.close"].tap()
        stage("settings.open")
        app.tabBars.buttons["설정"].tap()
        let hangul = app.switches["settings.hangul"]
        XCTAssertTrue(hangul.waitForExistence(timeout: 5))
        let before = hangul.value as? String
        XCTAssertTrue(before == "0" || before == "1")
        let after = before == "1" ? "0" : "1"
        stage("settings.hangul.toggle")
        tapSwitch(hangul, expecting: after)
        XCTAssertNotEqual(before, after)
        stage("settings.save.scroll")
        let save = app.buttons["settings.save"]
        scroll(save, identifier: "settings.save", in: app, interactive: true)
        XCTAssertTrue(save.isEnabled)
        stage("settings.save")
        save.tap()
        let saved = app.descendants(matching: .any)["settings.saved"]
        stage("settings.saved.feedback")
        // Give the save time to finish; Form may create its footer only once it is scrolled into view.
        _ = saved.waitForExistence(timeout: 5)
        scroll(saved, identifier: "settings.saved", in: app, interactive: false)
        stage("relaunch")
        app.terminate(); app.launch()
        XCTAssertTrue(app.navigationBars["Kanalog"].waitForExistence(timeout: 30))
        app.tabBars.buttons["설정"].tap()
        stage("settings.persisted.check")
        XCTAssertEqual(app.switches["settings.hangul"].value as? String, after)
        stage("completed")
    }
}
