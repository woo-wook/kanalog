import XCTest

final class KanalogUITests: XCTestCase {
    func testOfflineKanaRevealRateAndPersistedSettings() {
        let app = XCUIApplication()
        app.launchArguments = ["--public-content-only"]
        app.launch()
        XCTAssertTrue(app.navigationBars["Kanalog"].waitForExistence(timeout: 30))
        let katakana = app.switches["가타카나"]
        XCTAssertTrue(katakana.waitForExistence(timeout: 5))
        katakana.tap()
        let practice = app.buttons["선택한 208자 연습"]
        if !practice.isHittable { app.swipeUp() }
        XCTAssertTrue(practice.waitForExistence(timeout: 5))
        practice.tap()
        XCTAssertTrue(app.buttons["정답 보기"].waitForExistence(timeout: 10))
        app.buttons["정답 보기"].tap()
        XCTAssertTrue(app.buttons["보통"].waitForExistence(timeout: 5))
        app.buttons["보통"].tap()
        XCTAssertTrue(app.buttons["정답 보기"].waitForExistence(timeout: 10))
        app.buttons["닫기"].tap()
        app.tabBars.buttons["설정"].tap()
        let hangul = app.switches["한글 발음 보조"]
        XCTAssertTrue(hangul.waitForExistence(timeout: 5))
        let before = hangul.value as? String
        hangul.tap()
        let after = hangul.value as? String
        XCTAssertNotEqual(before, after)
        app.swipeUp()
        let save = app.buttons["설정 저장"]
        if !save.isHittable { app.swipeUp() }
        XCTAssertTrue(save.waitForExistence(timeout: 5))
        save.tap()
        XCTAssertTrue(app.staticTexts["기기에 저장했습니다"].waitForExistence(timeout: 10))
        app.terminate(); app.launch()
        XCTAssertTrue(app.navigationBars["Kanalog"].waitForExistence(timeout: 30))
        app.tabBars.buttons["설정"].tap()
        XCTAssertEqual(app.switches["한글 발음 보조"].value as? String, after)
    }
}
