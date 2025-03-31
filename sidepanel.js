document.getElementById('analyzeBtn').addEventListener('click', async () => {
  try {
    console.log('开始分析页面...');
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('当前标签页信息:', tab);
    
    // 使用分析器类进行URL分析
    const urlResult = GMGNAnalyzer.analyzeURL(tab.url);
    console.log('URL分析结果:', urlResult);
    
    // 如果是GMGN网站，则提取页面信息
    if (urlResult.isGMGN) {
      console.log('检测到GMGN网站，开始提取页面信息...');
      const pageInfo = await GMGNAnalyzer.extractPageInfo(tab);
      console.log('页面信息提取结果:', pageInfo);

      if (pageInfo.success) {
        console.log('开始执行规则分析...');
        // 执行规则分析
        const analysisResults = await GMGNRules.analyze(pageInfo.data);
        console.log('规则分析结果:', analysisResults);
        pageInfo.analysis = analysisResults;
      }

      urlResult.pageInfo = pageInfo;
    }
    
    // 只需要调用一次updateUI
    console.log('更新UI显示...');
    GMGNAnalyzer.updateUI(urlResult);
  } catch (error) {
    console.error('发生错误:', error);
    GMGNAnalyzer.updateUI({
      success: false,
      error: '获取页面信息失败: ' + error.message
    });
  }
}); 