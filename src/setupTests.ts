// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
//
// NOT (2026-10-10): Bu dosya CRA'nin standart konvansiyonu - react-scripts
// test, src/setupTests.{js,ts} var ise jest'in setupFilesAfterEach'ine
// otomatik ekler, package.json'da ayrica bir ayar gerekmez. Bu repodaki
// ILK Jest/RTL testleri (P1-2 geocoder bias - useGeocodeSearch.test.ts,
// LocationSearchInput/index.test.tsx) calistirilana kadar bu dosyaya hic
// ihtiyac olmamisti; @testing-library/jest-dom paketi yukluydu ama hic
// devreye girmiyordu (toBeInTheDocument vb. matcher'lar tanimsizdi).
import "@testing-library/jest-dom";
