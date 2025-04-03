class AnalyzerRegistry {
  static analyzers = {
    'gmgn.ai': GMGNAnalyzer,
    // 未来可以添加更多分析器
    // 'dexscreener.com': DexScreenerAnalyzer,
  };

  static log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] AnalyzerRegistry: ${message}`, data || '');
  }

  static getAnalyzerForURL(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      if (hostname.includes('gmgn.ai')) {
        return GMGNAnalyzer;
      }
      
      return null;
    } catch (error) {
      console.error('获取分析器失败:', error);
      return null;
    }
  }
}

window.AnalyzerRegistry = AnalyzerRegistry; 