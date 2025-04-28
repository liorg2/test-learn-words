import { test, expect } from '@playwright/test';

test.describe('Translation Game Direct Matching', () => {
  test('should match words with their correct translations', async ({ page }) => {
    // Navigate to the game page
    await page.goto('/game.html');
    
    // Wait for the game to load
    await page.waitForSelector('.game-area', { state: 'visible' });
    
    // Ensure we're on the translation game tab (first tab)
    const translationTab = page.locator('.game-type-tab', { hasText: 'תרגום' });
    await translationTab.click();
    
    // Wait for words to load
    await page.waitForSelector('.word', { state: 'visible' });
    await page.waitForSelector('.translation', { state: 'visible' });
    
    // Initial score
    let score = 0;
    const initialScore = await page.locator('#scoreDisplay').textContent();
    expect(initialScore).toBe('0');
    
    // Loop until all words are matched or max attempts reached
    const maxAttempts = 20;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Get all visible words
      const visibleWords = await page.locator('.word:visible').all();
      if (visibleWords.length === 0) {
        console.log('All words matched successfully!');
        break;
      }
      
      // Get all visible translations
      const visibleTranslations = await page.locator('.translation:visible').all();
      if (visibleTranslations.length === 0) break;
      
      // Use the first word and get its translation data attribute
      const wordElement = visibleWords[0];
      const wordText = await wordElement.textContent();
      const translationValue = await wordElement.getAttribute('data-translation');
      console.log(`Testing word: "${wordText}" with translation: "${translationValue}"`);
      
      // Find the translation element with matching text
      let matchFound = false;
      for (const translationElement of visibleTranslations) {
        if(matchFound) {
          break;
        }
        const translationText = await translationElement.textContent();
        
        if (translationText === translationValue) {
          console.log(`Found matching translation element: "${translationText}"`);
          matchFound = true;
          
          // Get current score before attempting
          const currentScoreText = await page.locator('#scoreDisplay').textContent();
          const currentScore = parseInt(currentScoreText || '0');
          
          // Perform drag and drop
          await performDragDrop(page, wordElement, translationElement);
          
          // Wait to see the result
          await page.waitForTimeout(1500);
      
        }
      }

      
      
      if (!matchFound) {
        console.log(`WARNING: No matching translation found for "${wordText}" (translation value: "${translationValue}")`);
      }
    }
    
    // Wait for animations to complete
    await page.waitForTimeout(1000);
    
    // Check that score increased
    const finalScore = await page.locator('#scoreDisplay').textContent();
    expect(parseInt(finalScore || '0')).toBeGreaterThan(parseInt(initialScore || '0'));
    
    // Summary card might be visible if game completed
    if (await page.locator('#summaryCard').isVisible()) {
      console.log('Game completed - summary card visible');
    }
  });
});

// Helper function to perform drag and drop
async function performDragDrop(page, sourceElement, targetElement) {
  const sourceBox = await sourceElement.boundingBox();
  const targetBox = await targetElement.boundingBox();
  
  if (!sourceBox || !targetBox) {
    console.log('Element not visible, cannot perform drag');
    return false;
  }
  
  // Perform drag-drop operation
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 5 }
  );
  await page.mouse.up();
  
  return true;
} 