"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var test_1 = require("@playwright/test");
test_1.test.describe('Translation Game Direct Matching', function () {
    (0, test_1.test)('should match words with their correct translations', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var translationTab, score, initialScore, maxAttempts, attempts, visibleWords, visibleTranslations, wordElement, wordText, translationValue, matchFound, _i, visibleTranslations_1, translationElement, translationText, currentScoreText, currentScore, dragSuccess, maxDragAttempts, dragAttempt, finalScore;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    // Set a longer timeout for the test
                    test_1.test.setTimeout(60000);
                    // Navigate to the game page
                    return [4 /*yield*/, page.goto('/game.html')];
                case 1:
                    // Navigate to the game page
                    _c.sent();
                    // Wait for the game to load
                    return [4 /*yield*/, page.waitForSelector('.game-area', { state: 'visible' })];
                case 2:
                    // Wait for the game to load
                    _c.sent();
                    translationTab = page.locator('.game-type-tab', { hasText: 'תרגום' });
                    return [4 /*yield*/, translationTab.click()];
                case 3:
                    _c.sent();
                    // Wait for words to load
                    return [4 /*yield*/, page.waitForSelector('.word', { state: 'visible' })];
                case 4:
                    // Wait for words to load
                    _c.sent();
                    return [4 /*yield*/, page.waitForSelector('.translation', { state: 'visible' })];
                case 5:
                    _c.sent();
                    score = 0;
                    return [4 /*yield*/, page.locator('#scoreDisplay').textContent()];
                case 6:
                    initialScore = _c.sent();
                    (0, test_1.expect)(initialScore).toBe('0');
                    maxAttempts = 20;
                    attempts = 0;
                    _c.label = 7;
                case 7:
                    if (!(attempts < maxAttempts)) return [3 /*break*/, 24];
                    attempts++;
                    return [4 /*yield*/, page.locator('.word:visible').all()];
                case 8:
                    visibleWords = _c.sent();
                    if (visibleWords.length === 0) {
                        console.log('All words matched successfully!');
                        return [3 /*break*/, 24];
                    }
                    return [4 /*yield*/, page.locator('.translation:visible').all()];
                case 9:
                    visibleTranslations = _c.sent();
                    if (visibleTranslations.length === 0)
                        return [3 /*break*/, 24];
                    wordElement = visibleWords[0];
                    return [4 /*yield*/, wordElement.textContent()];
                case 10:
                    wordText = _c.sent();
                    return [4 /*yield*/, wordElement.getAttribute('data-translation')];
                case 11:
                    translationValue = _c.sent();
                    console.log("Testing word: \"".concat(wordText, "\" with translation: \"").concat(translationValue, "\""));
                    matchFound = false;
                    _i = 0, visibleTranslations_1 = visibleTranslations;
                    _c.label = 12;
                case 12:
                    if (!(_i < visibleTranslations_1.length)) return [3 /*break*/, 23];
                    translationElement = visibleTranslations_1[_i];
                    if (matchFound) {
                        return [3 /*break*/, 23];
                    }
                    return [4 /*yield*/, translationElement.textContent()];
                case 13:
                    translationText = _c.sent();
                    if (!(translationText === translationValue)) return [3 /*break*/, 22];
                    console.log("Found matching translation element: \"".concat(translationText, "\""));
                    matchFound = true;
                    return [4 /*yield*/, page.locator('#scoreDisplay').textContent()];
                case 14:
                    currentScoreText = _c.sent();
                    currentScore = parseInt(currentScoreText || '0');
                    dragSuccess = false;
                    maxDragAttempts = 3;
                    dragAttempt = 1;
                    _c.label = 15;
                case 15:
                    if (!(dragAttempt <= maxDragAttempts)) return [3 /*break*/, 20];
                    console.log("Drag attempt #".concat(dragAttempt));
                    return [4 /*yield*/, performDragDrop(page, wordElement, translationElement)];
                case 16:
                    dragSuccess = _c.sent();
                    if (!dragSuccess) return [3 /*break*/, 17];
                    console.log('Drag successful');
                    return [3 /*break*/, 20];
                case 17:
                    if (!(dragAttempt < maxDragAttempts)) return [3 /*break*/, 19];
                    console.log('Retrying drag...');
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 18:
                    _c.sent();
                    _c.label = 19;
                case 19:
                    dragAttempt++;
                    return [3 /*break*/, 15];
                case 20: 
                // Wait to see the result (shorter timeout)
                return [4 /*yield*/, page.waitForTimeout(1000)];
                case 21:
                    // Wait to see the result (shorter timeout)
                    _c.sent();
                    _c.label = 22;
                case 22:
                    _i++;
                    return [3 /*break*/, 12];
                case 23:
                    if (!matchFound) {
                        console.log("WARNING: No matching translation found for \"".concat(wordText, "\" (translation value: \"").concat(translationValue, "\")"));
                    }
                    return [3 /*break*/, 7];
                case 24: 
                // Wait for animations to complete
                return [4 /*yield*/, page.waitForTimeout(1000)];
                case 25:
                    // Wait for animations to complete
                    _c.sent();
                    return [4 /*yield*/, page.locator('#scoreDisplay').textContent()];
                case 26:
                    finalScore = _c.sent();
                    (0, test_1.expect)(parseInt(finalScore || '0')).toBeGreaterThan(parseInt(initialScore || '0'));
                    return [4 /*yield*/, page.locator('#summaryCard').isVisible()];
                case 27:
                    // Summary card might be visible if game completed
                    if (_c.sent()) {
                        console.log('Game completed - summary card visible');
                    }
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)('should complete the entire translation game', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var translationTab, attempts, maxAttempts, visibleWords, visibleTranslations, wordElement, translationValue, matchFound, _i, visibleTranslations_2, translationElement, translationText, dragSuccess, dragAttempt, _c;
        var page = _b.page;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    test_1.test.setTimeout(60000);
                    return [4 /*yield*/, page.goto('/game.html')];
                case 1:
                    _d.sent();
                    return [4 /*yield*/, page.waitForSelector('.game-area', { state: 'visible' })];
                case 2:
                    _d.sent();
                    translationTab = page.locator('.game-type-tab', { hasText: 'תרגום' });
                    return [4 /*yield*/, translationTab.click()];
                case 3:
                    _d.sent();
                    return [4 /*yield*/, page.waitForSelector('.word', { state: 'visible' })];
                case 4:
                    _d.sent();
                    return [4 /*yield*/, page.waitForSelector('.translation', { state: 'visible' })];
                case 5:
                    _d.sent();
                    attempts = 0;
                    maxAttempts = 50;
                    _d.label = 6;
                case 6:
                    if (!(attempts < maxAttempts)) return [3 /*break*/, 20];
                    attempts++;
                    return [4 /*yield*/, page.locator('.word:visible').all()];
                case 7:
                    visibleWords = _d.sent();
                    if (visibleWords.length === 0)
                        return [3 /*break*/, 20];
                    return [4 /*yield*/, page.locator('.translation:visible').all()];
                case 8:
                    visibleTranslations = _d.sent();
                    if (visibleTranslations.length === 0)
                        return [3 /*break*/, 20];
                    wordElement = visibleWords[0];
                    return [4 /*yield*/, wordElement.getAttribute('data-translation')];
                case 9:
                    translationValue = _d.sent();
                    matchFound = false;
                    _i = 0, visibleTranslations_2 = visibleTranslations;
                    _d.label = 10;
                case 10:
                    if (!(_i < visibleTranslations_2.length)) return [3 /*break*/, 19];
                    translationElement = visibleTranslations_2[_i];
                    if (matchFound)
                        return [3 /*break*/, 19];
                    return [4 /*yield*/, translationElement.textContent()];
                case 11:
                    translationText = _d.sent();
                    if (!(translationText === translationValue)) return [3 /*break*/, 18];
                    matchFound = true;
                    dragSuccess = false;
                    dragAttempt = 1;
                    _d.label = 12;
                case 12:
                    if (!(dragAttempt <= 3)) return [3 /*break*/, 16];
                    return [4 /*yield*/, performDragDrop(page, wordElement, translationElement)];
                case 13:
                    dragSuccess = _d.sent();
                    if (dragSuccess)
                        return [3 /*break*/, 16];
                    return [4 /*yield*/, page.waitForTimeout(300)];
                case 14:
                    _d.sent();
                    _d.label = 15;
                case 15:
                    dragAttempt++;
                    return [3 /*break*/, 12];
                case 16: return [4 /*yield*/, page.waitForTimeout(500)];
                case 17:
                    _d.sent();
                    _d.label = 18;
                case 18:
                    _i++;
                    return [3 /*break*/, 10];
                case 19:
                    if (!matchFound)
                        return [3 /*break*/, 20];
                    return [3 /*break*/, 6];
                case 20: return [4 /*yield*/, page.waitForTimeout(1000)];
                case 21:
                    _d.sent();
                    _c = test_1.expect;
                    return [4 /*yield*/, page.locator('#summaryCard').isVisible()];
                case 22:
                    _c.apply(void 0, [_d.sent()]).toBeTruthy();
                    return [2 /*return*/];
            }
        });
    }); });
});
// Helper function to perform drag and drop
function performDragDrop(page, sourceElement, targetElement) {
    return __awaiter(this, void 0, void 0, function () {
        var sourceBox, targetBox, startX, startY, endX, endY, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sourceElement.boundingBox()];
                case 1:
                    sourceBox = _a.sent();
                    return [4 /*yield*/, targetElement.boundingBox()];
                case 2:
                    targetBox = _a.sent();
                    if (!sourceBox || !targetBox) {
                        console.log('Element not visible, cannot perform drag');
                        return [2 /*return*/, false];
                    }
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 14, , 16]);
                    // Increase timeout for operations
                    page.setDefaultTimeout(10000);
                    startX = sourceBox.x + sourceBox.width / 2;
                    startY = sourceBox.y + sourceBox.height / 2;
                    endX = targetBox.x + targetBox.width / 2;
                    endY = targetBox.y + targetBox.height / 2;
                    // Perform drag-drop operation with more deliberate steps
                    return [4 /*yield*/, page.mouse.move(startX, startY)];
                case 4:
                    // Perform drag-drop operation with more deliberate steps
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(100)];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, page.mouse.down()];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(100)];
                case 7:
                    _a.sent();
                    // Move in multiple steps to simulate more realistic dragging
                    // First move horizontally most of the way
                    return [4 /*yield*/, page.mouse.move(startX + (endX - startX) * 0.7, startY + (endY - startY) * 0.3, { steps: 5 })];
                case 8:
                    // Move in multiple steps to simulate more realistic dragging
                    // First move horizontally most of the way
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(100)];
                case 9:
                    _a.sent();
                    // Then finish the move to the target
                    return [4 /*yield*/, page.mouse.move(endX, endY, { steps: 5 })];
                case 10:
                    // Then finish the move to the target
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(100)];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, page.mouse.up()];
                case 12:
                    _a.sent();
                    // Wait a moment for the drop to register
                    return [4 /*yield*/, page.waitForTimeout(300)];
                case 13:
                    // Wait a moment for the drop to register
                    _a.sent();
                    return [2 /*return*/, true];
                case 14:
                    error_1 = _a.sent();
                    console.error('Error during drag and drop:', error_1);
                    // Force release mouse if operation failed
                    return [4 /*yield*/, page.mouse.up().catch(function () { })];
                case 15:
                    // Force release mouse if operation failed
                    _a.sent();
                    return [2 /*return*/, false];
                case 16: return [2 /*return*/];
            }
        });
    });
}
