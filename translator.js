export class Translator {
  static currentLang = 'zh';

  // 批处理相关配置
  static BATCH_SIZE = 20;  // 每批处理的最大文本数量
  static BATCH_DELAY = 100;  // 批处理延迟时间(ms)
  static pendingBatch = [];
  static batchPromise = null;

  static async translate(text, targetLang = 'en') {
    try {
      if (!text || !text.trim()) {
        return text;
      }

      // 将翻译请求添加到批处理队列
      return new Promise((resolve) => {
        this.pendingBatch.push({ text, resolve });
        
        if (!this.batchPromise) {
          this.batchPromise = setTimeout(async () => {
            this.batchPromise = null;
            await this.processBatch();
          }, this.BATCH_DELAY);
        }
      });
    } catch (error) {
      console.error('Translation failed:', error);
      return text;
    }
  }

  static async translateBatch(texts, targetLang) {
    if (texts.length === 0) return [];
    
    try {
      const combinedText = texts.join('\n||||\n');
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(combinedText)}`
      );
      const data = await response.json();
      
      const translations = [];
      let currentIndex = 0;
      
      while (currentIndex < data[0].length && data[0][currentIndex]) {
        translations.push(data[0][currentIndex][0]);
        currentIndex++;
      }

      return translations;
    } catch (error) {
      console.error('Batch translation failed:', error);
      return texts;
    }
  }

  static async processBatch() {
    if (this.pendingBatch.length === 0) return;
    
    const batch = this.pendingBatch.splice(0, this.BATCH_SIZE);
    const texts = batch.map(item => item.text);
    
    const translations = await this.translateBatch(texts, 'en');
    
    // 处理翻译结果
    batch.forEach((item, index) => {
      if (translations[index]) {
        item.resolve(translations[index]);
      } else {
        item.resolve(item.text);
      }
    });
  }

  static async translatePage(lang) {
    this.currentLang = lang;

    // 获取所有需要翻译的文本节点
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // 跳过表格内容，但允许表头
          if (node.parentElement.closest('table') && 
              !node.parentElement.closest('th')) {
            return NodeFilter.FILTER_REJECT;
          }
          // 跳过代码块
          if (node.parentElement.closest('code')) {
            return NodeFilter.FILTER_REJECT;
          }
          // 跳过链接地址
          if (node.parentElement.tagName === 'A' && node.textContent.includes('http')) {
            return NodeFilter.FILTER_REJECT;
          }
          // 跳过空白文本
          if (!node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    // 保存和翻译文本
    for (const node of textNodes) {
      const parent = node.parentElement;
      
      // 保存原始文本
      if (!parent.getAttribute('data-original-text')) {
        parent.setAttribute('data-original-text', node.textContent);
      }

      if (lang === 'en') {
        const translated = await this.translate(parent.getAttribute('data-original-text'));
        node.textContent = translated;
      } else {
        node.textContent = parent.getAttribute('data-original-text');
      }
    }

    // 更新按钮文本
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!analyzeBtn.getAttribute('data-original-text')) {
      analyzeBtn.setAttribute('data-original-text', analyzeBtn.textContent);
    }
    if (lang === 'en') {
      analyzeBtn.textContent = 'Analyze Current Contract';
    } else {
      analyzeBtn.textContent = analyzeBtn.getAttribute('data-original-text');
    }
  }

  // 新增：翻译单个元素
  static async translateElement(element) {
    if (this.currentLang !== 'en') return;

    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // 跳过表格内容，但允许表头
          if (node.parentElement.closest('table') && 
              !node.parentElement.closest('th')) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.parentElement.closest('code')) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.parentElement.tagName === 'A' && node.textContent.includes('http')) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent.getAttribute('data-original-text')) {
        parent.setAttribute('data-original-text', node.textContent);
      }

      const translated = await this.translate(parent.getAttribute('data-original-text'));
      node.textContent = translated;
    }
  }
} 