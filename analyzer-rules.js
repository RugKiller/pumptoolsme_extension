class GMGNRules {
  // 分析规则配置
  static rules = {
    checkTwitterHistory: {
      name: '推特历史检查',
      analyze: async (data) => {
        console.log('开始检查推特历史, 输入数据:', data);

        if (!data.twitter?.value) {
          console.log('未找到推特账号信息');
          return {
            level: 'warning',
            message: '未绑定推特账号',
            details: this.formatHistoryData(null)
          };
        }

        console.log('找到推特账号:', data.twitter.value);

        try {
          const url = 'https://pumptools.me/api/monitoring/search_alerts';
          const payload = {
            query: data.twitter.value
          };
          
          console.log('准备发送请求到:', url);
          console.log('请求参数:', payload);

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          console.log('收到响应:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          });

          if (!response.ok) {
            throw new Error('HTTP error! Status: ' + response.status);
          }

          const result = await response.json();
          console.log('解析响应数据:', result);
          
          if (result.status === 'success') {
            if (result.data?.length > 0) {
              console.log(`找到${result.data.length}条历史记录:`, result.data);
              return {
                level: 'warning',
                message: '',
                details: this.formatHistoryData(result.data)
              };
            } else {
              console.log('未找到历史记录');
              return {
                level: 'success',
                message: '未发现异常历史',
                details: this.formatHistoryData(null)
              };
            }
          } else {
            console.warn('API返回非成功状态:', result);
            return {
              level: 'error',
              message: '检查失败: API返回非成功状态',
              details: this.formatHistoryData(null)
            };
          }
        } catch (error) {
          console.error('请求出错:', error);
          return {
            level: 'error',
            message: '检查失败: ' + error.message,
            details: this.formatHistoryData(null)
          };
        }
      }
    }
  };

  // 格式化历史数据为HTML表格
  static formatHistoryData(data) {
    // 如果没有数据，显示"没有发现异常"
    if (!data || data.length === 0) {
      return `
        <div class="section-card warning-section">
          <h3 class="section-title">重要告警信息</h3>
          <div class="stats-grid no-data">
            <div class="stat-item">
              <span class="stat-value">没有发现异常！仅仅说明绑定的推特没有异常，但并不表明该推特是发布方持有，请务必注意风险！！！</span>
            </div>
          </div>
        </div>
      `;
    }

    // 统计各类修改次数
    const stats = {
      delete_tweet: 0,
      modify_description: 0,
      modify_user_name: 0,
      modify_show_name: 0
    };

    // 计算各类型的次数
    data.forEach(item => {
      switch (item.modify_type) {
        case 'delete_tweet':
          stats.delete_tweet++;
          break;
        case 'modify_description':
          stats.modify_description++;
          break;
        case 'modify_user_name':
          stats.modify_user_name++;
          break;
        case 'modify_show_name':
          stats.modify_show_name++;
          break;
      }
    });

    // 获取第一条数据的代币历史并解析
    const tokensHistory = data[0]?.tokens_history
      .split('</br>')
      .filter(token => token.trim())  // 过滤空行
      .map(token => {
        const parts = token.split(':');
        if (parts.length >= 3) {
          const chain = parts[0];
          const address = parts[1];
          const symbol = parts[2];

          // 根据链类型生成不同的链接
          let chainPath;
          switch (chain.toLowerCase()) {
            case 'bnb chain':
                chainPath = 'bsc';
                break
            case 'solana':
              chainPath = 'solana';
              break;
            case 'tron':
              chainPath = 'tron';
              break;
            case 'sui':
              chainPath = 'sui';
              break;
            default:
              chainPath = 'solana';
          }

          const tokenUrl = `https://web3.okx.com/zh-hans/token/${chainPath}/${address}`;

          return `<tr>
            <td>${chain}</td>
            <td>${symbol}</td>
            <td>
              <a href="${tokenUrl}" target="_blank" style="color: #1a73e8; text-decoration: none;">
                ${address}
              </a>
            </td>
          </tr>`;
        }
        return '';
      })
      .filter(row => row)
      .join('');

    // 计算代币数量
    const tokenCount = data[0]?.tokens_history
      .split('</br>')
      .filter(token => token.trim()).length;

    // 1. 页面基本信息在 analyzer.js 中已经处理

    // 2. 重要告警信息（账号行为统计）
    const warningSection = `
      <div class="section-card warning-section">
        <h3 class="section-title">重要告警信息-关于绑定推特</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">历史发币数：</span>
            <span class="stat-value${tokenCount > 0 ? ' highlight' : ''}">${tokenCount}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">删除推文次数：</span>
            <span class="stat-value${stats.delete_tweet > 0 ? ' highlight' : ''}">${stats.delete_tweet}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">修改用户名次数：</span>
            <span class="stat-value${stats.modify_user_name > 0 ? ' highlight' : ''}">${stats.modify_user_name}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">修改用户昵称次数：</span>
            <span class="stat-value${stats.modify_show_name > 0 ? ' highlight' : ''}">${stats.modify_show_name}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">修改账号描述次数：</span>
            <span class="stat-value${stats.modify_description > 0 ? ' highlight' : ''}">${stats.modify_description}</span>
          </div>
        </div>
      </div>
    `;

    // 3. 推特行为分析
    const twitterAnalysis = `
      <div class="section-card twitter-section">
        <h3 class="section-title">推特高危行为详情</h3>
        <table class="history-table">
          <thead>
            <tr>
              <th>修改类型</th>
              <th>修改时间</th>
              <th>修改详情</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => {
              const modificationLog = item.modification_log
                .replace(/Raw Value:<\/br>/, '<strong>原始值:</strong><br>')
                .replace(/New Value:<\/br>/, '<strong>新值:</strong><br>')
                .replace(/<\/br><\/br>/g, '<br>')
                .replace(/<\/br>/g, '<br>');
              return `
                <tr>
                  <td>${item.modify_type || '-'}</td>
                  <td>${item.gmt_modify || '-'}</td>
                  <td>
                    <div class="modification-log">
                      ${modificationLog || '-'}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <h4>历史绑定了该推特的代币</h4>
        <table class="tokens-table">
          <thead>
            <tr>
              <th>链</th>
              <th>代币符号</th>
              <th>合约地址</th>
            </tr>
          </thead>
          <tbody>
            ${tokensHistory}
          </tbody>
        </table>
      </div>
    `;

    return warningSection + twitterAnalysis;
  }

  // 执行所有分析
  static async analyze(pageData) {
    const results = {
      summary: [],
      details: {}
    };

    // 遍历所有规则进行分析
    for (const [ruleId, rule] of Object.entries(this.rules)) {
      try {
        const result = await rule.analyze(pageData);
        results.details[ruleId] = {
          name: rule.name,
          ...result
        };
        results.summary.push({
          ruleId,
          name: rule.name,
          level: result.level,
          message: result.message
        });
      } catch (error) {
        console.error(`规则 ${ruleId} 执行失败:`, error);
        results.details[ruleId] = {
          name: rule.name,
          level: 'error',
          message: '规则执行失败'
        };
      }
    }

    return results;
  }

  // 获取分析结果的HTML展示
  static getResultHTML(analysisResults) {
    let html = '<div class="analysis-results">';
    
    // 添加详细信息部分
    for (const [ruleId, detail] of Object.entries(analysisResults.details)) {
      if (detail.details) {
        html += `
          <div class="detail-section">
            ${detail.details}
          </div>
        `;
      }
    }
    html += '</div>';
    
    return html;
  }
}

// 导出分析规则类
window.GMGNRules = GMGNRules; 