document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const resultDiv = document.getElementById('result');
  
  try {
    // 显示加载状态
    resultDiv.innerHTML = `
      <div class="loading-section">
        <div class="loading-text">
          <div class="loading-spinner"></div>
          <span>正在分析合约信息，请稍等...</span>
        </div>
      </div>
    `;

    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 获取对应的分析器
    const analyzer = AnalyzerRegistry.getAnalyzerForURL(tab.url);
    if (!analyzer) {
      throw new Error('请打开支持的网站页面');
    }

    // 分析URL
    const urlAnalysis = await analyzer.analyzeURL(tab.url);
    if (!urlAnalysis.success) {
      throw new Error('不支持的网站类型');
    }

    // 获取并展示基本信息
    const pageInfo = await analyzer.extractPageInfo(tab);
    const initialResult = {
      success: true,
      isSupported: true,
      pageInfo: {
        ...pageInfo,
        analysis: {
          isLoading: true
        }
      }
    };
    
    // 立即展示基本信息和加载状态
    analyzer.updateUI(initialResult);

    // 获取规则分析结果
    const analysis = await GMGNRules.analyze(pageInfo.data);
    
    // 更新结果
    const finalResult = {
      ...initialResult,
      pageInfo: {
        ...pageInfo,
        analysis: analysis
      }
    };

    // 更新UI，显示完整结果
    analyzer.updateUI(finalResult);

  } catch (error) {
    console.error('分析失败:', error);
    resultDiv.innerHTML = `
      <div class="result-item error">
        ❌ ${error.message || '分析失败，请重试'}
      </div>
    `;
  }
}); 