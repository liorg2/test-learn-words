import { test, expect } from '@playwright/test';

test.describe('Translation Game Direct Matching', () => {
  test('should match words with their correct translations', async ({ page }) => {
    // Set a longer timeout for the test
    test.setTimeout(60000);
    
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
          
          // Perform drag and drop with retry
          let dragSuccess = false;
          const maxDragAttempts = 3;
          
          for (let dragAttempt = 1; dragAttempt <= maxDragAttempts; dragAttempt++) {
            console.log(`Drag attempt #${dragAttempt}`);
            dragSuccess = await performDragDrop(page, wordElement, translationElement);
            
            if (dragSuccess) {
              console.log('Drag successful');
              break;
            } else if (dragAttempt < maxDragAttempts) {
              console.log('Retrying drag...');
              await page.waitForTimeout(500);
            }
          }
          
          // Wait to see the result (shorter timeout)
          await page.waitForTimeout(1000);
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

    test('should complete the entire translation game', async ({page}) => {
        test.setTimeout(60000);
        await page.goto('/game.html');
        await page.waitForSelector('.game-area', {state: 'visible'});
        const translationTab = page.locator('.game-type-tab', {hasText: 'תרגום'});
        await translationTab.click();
        await page.waitForSelector('.word', {state: 'visible'});
        await page.waitForSelector('.translation', {state: 'visible'});

        let attempts = 0;
        const maxAttempts = 50;
        while (attempts < maxAttempts) {
            attempts++;
            const visibleWords = await page.locator('.word:visible').all();
            if (visibleWords.length === 0) break;
            const visibleTranslations = await page.locator('.translation:visible').all();
            if (visibleTranslations.length === 0) break;
            const wordElement = visibleWords[0];
            const translationValue = await wordElement.getAttribute('data-translation');
            let matchFound = false;
            for (const translationElement of visibleTranslations) {
                if (matchFound) break;
                const translationText = await translationElement.textContent();
                if (translationText === translationValue) {
                    matchFound = true;
                    let dragSuccess = false;
                    for (let dragAttempt = 1; dragAttempt <= 3; dragAttempt++) {
                        dragSuccess = await performDragDrop(page, wordElement, translationElement);
                        if (dragSuccess) break;
                        await page.waitForTimeout(300);
                    }
                    await page.waitForTimeout(500);
                }
            }
            if (!matchFound) break;
        }
        await page.waitForTimeout(1000);
        expect(await page.locator('#summaryCard').isVisible()).toBeTruthy();
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
  
  try {
    // Increase timeout for operations
    page.setDefaultTimeout(10000);
    
    // Start position
    const startX = sourceBox.x + sourceBox.width / 2;
    const startY = sourceBox.y + sourceBox.height / 2;
    
    // End position
    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y + targetBox.height / 2;
    
    // Perform drag-drop operation with more deliberate steps
    await page.mouse.move(startX, startY);
    await page.waitForTimeout(100);
    await page.mouse.down();
    await page.waitForTimeout(100);
    
    // Move in multiple steps to simulate more realistic dragging
    // First move horizontally most of the way
    await page.mouse.move(
      startX + (endX - startX) * 0.7,
      startY + (endY - startY) * 0.3,
      { steps: 5 }
    );
    
    await page.waitForTimeout(100);
    
    // Then finish the move to the target
    await page.mouse.move(endX, endY, { steps: 5 });
    await page.waitForTimeout(100);
    
    await page.mouse.up();
    
    // Wait a moment for the drop to register
    await page.waitForTimeout(300);
    
    return true;
  } catch (error) {
    console.error('Error during drag and drop:', error);
    
    // Force release mouse if operation failed
    await page.mouse.up().catch(() => {});
    return false;
  }
} 