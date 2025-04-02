document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const resultDiv = document.getElementById('result');
  
  try {
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 分析URL
    const urlAnalysis = GMGNAnalyzer.analyzeURL(tab.url);
    if (!urlAnalysis.isGMGN) {
      throw new Error('请打开GMGN的合约详情页面');
    }

    // 第一步：获取并展示基本信息
    const pageInfo = await GMGNAnalyzer.extractPageInfo(tab);
    const initialResult = {
      success: true,
      isGMGN: true,
      pageInfo: {
        ...pageInfo,
        analysis: {
          isLoading: true  // 添加加载状态
        }
      }
    };
    
    // 立即展示基本信息和加载状态
    GMGNAnalyzer.updateUI(initialResult);

    // 第二步：获取规则分析结果
    const analysis = await GMGNRules.analyze(pageInfo.data);
    
    // 更新结果，添加规则分析内容
    const finalResult = {
      ...initialResult,
      pageInfo: {
        ...pageInfo,
        analysis: analysis
      }
    };

    // 更新UI，显示完整结果
    GMGNAnalyzer.updateUI(finalResult);

  } catch (error) {
    console.error('分析失败:', error);
    resultDiv.innerHTML = `
      <div class="result-item error">
        ❌ ${error.message || '分析失败，请重试'}
      </div>
    `;
  }
}); 