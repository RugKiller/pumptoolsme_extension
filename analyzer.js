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
    if (!resultDiv) {
      this.log('未找到结果显示元素:', elementId);
      return;
    }

    if (!result.success) {
      this.log('显示错误信息:', result.error);
      resultDiv.textContent = '❌ 分析失败: ' + result.error;
      resultDiv.style.backgroundColor = '#ffebee';
      return;
    }

    if (result.pageInfo) {
      this.log('显示页面详细信息');
      let html = result.isGMGN ? 
        `<div style="margin-bottom: 10px">✅ 当前页面是 GMGN.ai 网站</div>` : 
        `<div style="margin-bottom: 10px">❌ 当前页面 (${result.domain}) 不是 GMGN.ai 网站</div>`;

      if (result.pageInfo.success) {
        const info = result.pageInfo.data;
        this.log('解析到的页面信息:', info);
        html += '<div style="background-color: #f5f5f5; padding: 10px; border-radius: 4px;">';
        for (const [type, data] of Object.entries(info)) {
          html += `<div style="margin: 5px 0;">
            <strong>${data.name}:</strong> ${data.value}
          </div>`;
        }
        html += '</div>';
      }

      resultDiv.innerHTML = html;
      resultDiv.style.backgroundColor = result.isGMGN ? '#e8f5e9' : '#ffebee';
    } else {
      this.log('显示基本URL分析结果');
      resultDiv.textContent = result.isGMGN ? 
        `✅ 当前页面是 GMGN.ai 网站` : 
        `❌ 当前页面 (${result.domain}) 不是 GMGN.ai 网站`;
      resultDiv.style.backgroundColor = result.isGMGN ? '#e8f5e9' : '#ffebee';
    }
    this.log('UI更新完成');
  }
}

// 导出分析器类
window.GMGNAnalyzer = GMGNAnalyzer;