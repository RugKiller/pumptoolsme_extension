class GMGNAnalyzer {
  static siteConfigs = {
    'gmgn.ai': [
      {
        xpath: "//div[contains(@class, 'css-1av451l')]/text()",
        type: 'content',
        name: '代币符号',
        process: (text) => text.trim()
      },
      {
        xpath: "//a[@id='searchca' and contains(@href, 'x.com/search?q=')]",
        type: 'contract',
        name: '合约地址',
        process: (href) => {
          try {
            const match = href.match(/[?&]q=([^&]+)/);
            if (match && match[1]) {
              return match[1];
            }
            return '未找到合约地址';
          } catch (error) {
            console.error('处理合约地址失败:', error);
            return '处理合约地址失败';
          }
        }
      },
      {
        xpath: "//a[(.//div[@data-key='twitter'] or contains(@class, 'css-1wcebk6')) and (contains(@href, 'twitter.com/') or contains(@href, 'x.com/')) and not(contains(@href, '/search?'))]",
        type: 'twitter',
        name: '绑定推特',
        process: (href) => {
          try {
            let username;
            href = href.replace(/^@/, '');
            
            const match = href.match(/(?:twitter|x)\.com\/([^/?]+)/);
            if (match && match[1]) {
              username = decodeURIComponent(match[1]);
              if (['search', 'home', 'explore', 'notifications'].includes(username)) {
                return '未找到推特账号';
              }
              return `https://x.com/${username}`;
            }
            
            return '未找到推特账号';
          } catch (error) {
            console.error('处理推特链接失败:', error);
            return '处理推特链接失败';
          }
        }
      },
      {
        xpath: "//a[contains(@href, '/address/') and .//div[contains(@class, 'css-1h8ua02')]]",
        type: 'creator',
        name: '合约创建者',
        process: (href) => {
          try {
            // 从路径中提取链类型和地址
            const match = href.match(/\/([^/]+)\/address\/([^/?]+)/);
            if (match && match[1] && match[2]) {
              const chain = match[1];    // 链类型 (sol, eth 等)
              const address = match[2];   // 地址
              return `${chain}:${address}`;  // 返回 chain:address 格式
            }
            return '未找到创建者地址';
          } catch (error) {
            console.error('处理创建者地址失败:', error);
            return '处理创建者地址失败';
          }
        }
      },
      {
        type: 'pageUrl',
        name: '页面链接',
        special: 'url'
      }
    ]
  };

  // 添加日志方法
  static log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] GMGNAnalyzer: ${message}`, data || '');
  }

  // 分析URL是否为GMGN网站
  static analyzeURL(url) {
    this.log('开始分析URL:', url);
    try {
      const urlObj = new URL(url);
      const result = {
        isGMGN: urlObj.hostname.includes('gmgn.ai'),
        domain: urlObj.hostname,
        success: true
      };
      this.log('URL分析结果:', result);
      return result;
    } catch (error) {
      this.log('URL分析失败:', error);
      return {
        isGMGN: false,
        error: error.message,
        success: false
      };
    }
  }

  // 从页面获取指定信息
  static async extractPageInfo(tab) {
    this.log('开始提取页面信息, tabId:', tab.id);
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (configs) => {
          const log = (msg, data) => console.log(`[Page Context] ${msg}`, data || '');
          
          log('开始解析页面元素, 配置:', configs);
          const results = {};

          configs.forEach(config => {
            try {
              // 特殊处理：页面URL
              if (config.special === 'url') {
                results[config.type] = {
                  name: config.name,
                  value: window.location.href
                };
                return;
              }

              log('当前页面URL:', window.location.href);
              log('页面标题:', document.title);
              
              if (config.type === 'content') {
                const xpathResult = document.evaluate(
                  config.xpath,
                  document,
                  null,
                  XPathResult.STRING_TYPE,
                  null
                );
                
                log(`XPath查询结果类型: ${xpathResult.resultType}`);
                const value = xpathResult.stringValue;
                log(`找到的文本:`, value);

                results[config.type] = {
                  name: config.name,
                  value: value.trim() || '未找到'
                };
              } else {
                const element = document.evaluate(
                  config.xpath,
                  document,
                  null,
                  XPathResult.FIRST_ORDERED_NODE_TYPE,
                  null
                ).singleNodeValue;
                log(`找到的元素:`, element);
                
                if (element) {
                  log(`元素类型: ${element.nodeType}`);
                  log(`元素名称: ${element.nodeName}`);
                  log(`元素内容: ${element.textContent}`);
                  log(`直接文本内容:`, element.childNodes[0]?.nodeValue);
                  if (element instanceof HTMLAnchorElement) {
                    log(`链接地址: ${element.href}`);
                    // 对于链接类型，直接存储href
                    results[config.type] = {
                      name: config.name,
                      value: element.href,
                      needsProcessing: true  // 标记需要后续处理
                    };
                    return;  // 跳过后面的处理
                  }
                }

                // 其他类型的处理
                results[config.type] = {
                  name: config.name,
                  value: element ? element.textContent : '未找到'
                };
              }
            } catch (error) {
              log(`解析元素 ${config.name} 失败:`, error);
              results[config.type] = {
                name: config.name,
                value: '解析失败'
              };
            }
          });
          return results;
        },
        args: [this.siteConfigs['gmgn.ai']]
      });

      // 处理结果
      const processedResult = {
        success: true,
        data: {}
      };

      Object.entries(result[0].result).forEach(([type, data]) => {
        const config = this.siteConfigs['gmgn.ai'].find(c => c.type === type);
        if (config.special === 'url') {
          // 特殊处理：页面URL直接使用
          processedResult.data[type] = data;
        } else if (data.needsProcessing && config && config.process) {
          // 常规处理
          processedResult.data[type] = {
            name: data.name,
            value: config.process(data.value)
          };
        } else {
          processedResult.data[type] = data;
        }
      });

      this.log('页面信息提取成功:', processedResult);
      return processedResult;

    } catch (error) {
      this.log('页面信息提取失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static updateUI(result, elementId = 'result') {
    this.log('开始更新UI:', result);
    const resultDiv = document.getElementById(elementId);
    const usageGuide = document.querySelector('.usage-guide');
    
    if (!resultDiv) {
      this.log('未找到结果显示元素:', elementId);
      return;
    }

    // 统一错误处理函数
    const showError = () => {
      resultDiv.innerHTML = `
        <div class="result-item error">
          ❌ 请打开GMGN的合约详情页面再点击按钮
        </div>
      `;
    };

    // 检查基本错误情况
    if (!result.success || !result.isGMGN || !result.pageInfo || !result.pageInfo.success) {
      this.log('显示错误信息:', result.error);
      showError();
      return;
    }

    // 检查是否获取到了任何有效信息
    const pageData = result.pageInfo.data;
    const isValidValue = (value) => value && value !== '未找到' && value !== '解析失败';
    
    const hasAnyValidData = pageData && (
      isValidValue(pageData.content?.value) ||
      isValidValue(pageData.contract?.value) ||
      isValidValue(pageData.creator?.value) ||
      isValidValue(pageData.twitter?.value)
    );

    if (!hasAnyValidData) {
      showError();
      return;
    }

    this.log('显示页面详细信息');
    // 如果数据获取成功，隐藏使用说明
    if (usageGuide) {
      usageGuide.style.display = 'none';
    }

    let html = `
      <div class="section-card contract-info">
        <h3 class="section-title">合约基本信息</h3>
        <div class="info-grid">
          ${this.formatContractInfo(pageData)}
        </div>
      </div>
    `;

    if (result.pageInfo.analysis) {
      html += GMGNRules.getResultHTML(result.pageInfo.analysis);
    }

    resultDiv.innerHTML = html;
  }

  // 新增方法来格式化合约信息
  static formatContractInfo(info) {
    const formatTwitterValue = (value) => {
      if (value && value.startsWith('https://')) {
        return `<a href="${value}" target="_blank" class="twitter-link">${value.replace('https://x.com/', '@')}</a>`;
      }
      return value || '-';
    };

    const infoMap = {
      'content': { label: '代币符号', value: info.content?.value || '-' },
      'contract': { label: '合约地址', value: info.contract?.value || '-' },
      'creator': { label: '合约创建者', value: info.creator?.value || '-' },
      'twitter': { 
        label: '绑定推特', 
        value: formatTwitterValue(info.twitter?.value)
      }
    };

    return Object.entries(infoMap)
      .filter(([key]) => key !== 'pageUrl')
      .map(([key, data]) => `
        <div class="info-row">
          <div class="info-label">${data.label}</div>
          <div class="info-value ${key === 'contract' || key === 'creator' ? 'monospace' : ''}">${data.value}</div>
        </div>
      `).join('');
  }
}

// 导出分析器类
window.GMGNAnalyzer = GMGNAnalyzer;