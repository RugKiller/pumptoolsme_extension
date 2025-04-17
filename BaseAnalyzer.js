class BaseAnalyzer {
  static log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${this.name}: ${message}`, data || '');
  }


  static init() {
    // 检查当前页面是否有合约

  }
}

window.BaseAnalyzer = BaseAnalyzer;