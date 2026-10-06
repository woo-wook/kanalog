import XCTest
import SwiftUI
import UIKit
@testable import Kanalog

private struct SegmentWidths: PreferenceKey {
    static var defaultValue: [CGFloat] { [] }
    static func reduce(value: inout [CGFloat], nextValue: () -> [CGFloat]) { value += nextValue() }
}
@MainActor
private final class WidthMeasurement { var widths: [CGFloat] = [] }

final class FlowLayoutTests: XCTestCase {
    @MainActor
    func testSingleLongReadingSegmentFitsNarrowViewport() {
        let measured = expectation(description: "long segment is laid out")
        measured.assertForOverFulfill = false
        let measurement = WidthMeasurement()
        let view = FlowLayout(spacing: 2) {
            VStack(spacing: 2) {
                Text(String(repeating: "にほんご", count: 40)).font(.system(size: 13))
                Text(String(repeating: "長い例文", count: 40)).font(.system(size: 28))
            }
            .background(GeometryReader { proxy in Color.clear.preference(key: SegmentWidths.self, value: [proxy.size.width]) })
        }
        .onPreferenceChange(SegmentWidths.self) { widths in
            guard !widths.isEmpty else { return }
            Task { @MainActor in measurement.widths = widths; measured.fulfill() }
        }
        let controller = UIHostingController(rootView: view)
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 320, height: 640))
        window.rootViewController = controller
        window.makeKeyAndVisible()
        defer { window.isHidden = true; window.rootViewController = nil }
        controller.view.setNeedsLayout(); controller.view.layoutIfNeeded()
        wait(for: [measured], timeout: 10)
        XCTAssertFalse(measurement.widths.isEmpty)
        for width in measurement.widths {
            XCTAssertGreaterThan(width, 0)
            XCTAssertLessThanOrEqual(width, 320)
        }
    }
}
