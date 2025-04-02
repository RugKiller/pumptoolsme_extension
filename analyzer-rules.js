class GMGNRules {
  // API 基础配置
  static API_CONFIG = {
    PUMP_TOOLS: {
      BASE_URL: 'http://pumptools.me:8088/api/extension',
      ENDPOINTS: {
        TWITTER_TOKENS: '/get_x_tokens_history',  // 推特账号发币历史
        TWITTER_MODIFICATIONS: '/get_x_modification_logs',  // 推特账号异常修改历史
        CREATOR_TOKENS: '/get_creator_info'  // 创建者发币历史
      }
    }
  };

  // 添加静态属性存储当前数据
  static currentData = null;
  static currentModificationData = null;
  static currentCreatorData = null;

  // 通用 API 请求方法
  static async makeRequest(endpoint, payload, description) {
    try {
      const url = `${this.API_CONFIG.PUMP_TOOLS.BASE_URL}${endpoint}`;
      
      console.log(`准备发送${description}请求:`, url);
      console.log('请求参数:', payload);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error text available');
        throw new Error(`HTTP error! Status: ${response.status}, Body: ${errorText}`);
      }

      const result = await response.json();
      console.log(`${description}响应数据:`, result);
      return result;
    } catch (error) {
      console.error(`${description}失败:`, error);
      throw error;
    }
  }

  // 分析规则配置
  static rules = {
    checkTwitterTokens: {
      name: '推特发币历史检查',
      analyze: async (data) => {
        console.log('开始检查推特发币历史, 输入数据:', data);
        try {
          if (!data.twitter?.value) {
            return {
              level: 'warning',
              message: '未绑定推特账号',
              details: this.formatErrorData('未绑定推特账号')
            };
          }
          const twitterHistory = await this.fetchTwitterTokens(data.twitter.value);
          return this.processTwitterTokens(twitterHistory);
        } catch (error) {
          console.error('推特发币历史检查失败:', error);
          return {
            level: 'error',
            message: '推特发币历史检查失败',
            details: this.formatErrorData('推特发币历史检查失败')
          };
        }
      }
    },

    checkTwitterModifications: {
      name: '推特异常修改检查',
      analyze: async (data) => {
        console.log('开始检查推特异常修改历史, 输入数据:', data);
        try {
          if (!data.twitter?.value) {
            return {
              level: 'warning',
              message: '未绑定推特账号',
              details: this.formatErrorData('未绑定推特账号')
            };
          }
          const modificationHistory = await this.fetchTwitterModifications(data.twitter.value);
          return this.processTwitterModifications(modificationHistory);
        } catch (error) {
          console.error('推特异常修改检查失败:', error);
          return {
            level: 'error',
            message: '推特异常修改检查失败',
            details: this.formatErrorData('推特异常修改检查失败')
          };
        }
      }
    },

    checkCreatorTokens: {
      name: '创建者发币历史检查',
      analyze: async (data) => {
        console.log('开始检查创建者发币历史, 输入数据:', data);
        try {
          if (!data.contract?.value || !data.contract?.chain) {
            return {
              level: 'warning',
              message: '未找到完整的合约信息',
              details: this.formatErrorData('未找到完整的合约信息')
            };
          }

          const chain = data.contract.chain;
          const address = data.contract.value;

          console.log('使用合约信息:', {
            chain,
            address
          });

          const creatorHistory = await this.fetchCreatorTokens(chain, address);
          return this.processCreatorTokens(creatorHistory);
        } catch (error) {
          console.error('创建者发币历史检查失败:', error);
          return {
            level: 'error',
            message: '创建者发币历史检查失败',
            details: this.formatErrorData('创建者发币历史检查失败')
          };
        }
      }
    }
  };

  // API 调用方法
  static async fetchTwitterTokens(twitterUrl) {
    if (!twitterUrl.startsWith('http')) {
      twitterUrl = `https://x.com/${twitterUrl}`;
    }
    return this.makeRequest(
      this.API_CONFIG.PUMP_TOOLS.ENDPOINTS.TWITTER_TOKENS,
      { twitter_url: twitterUrl },
      '推特发币历史'
    );
  }

  static async fetchTwitterModifications(twitterUrl) {
    if (!twitterUrl.startsWith('http')) {
      twitterUrl = `https://x.com/${twitterUrl}`;
    }
    return this.makeRequest(
      this.API_CONFIG.PUMP_TOOLS.ENDPOINTS.TWITTER_MODIFICATIONS,
      { twitter_url: twitterUrl },
      '推特异常修改'
    );
  }

  static async fetchCreatorTokens(chain, address) {
    return this.makeRequest(
      this.API_CONFIG.PUMP_TOOLS.ENDPOINTS.CREATOR_TOKENS,
      { 
        chain: chain,
        token_address: address  // 使用合约地址
      },
      '创建者发币历史'
    );
  }

  // 数据处理方法
  static processTwitterTokens(data) {
    // TODO: 处理推特发币历史数据的逻辑
    return {
      level: 'info',
      message: '推特发币历史检查完成',
      details: this.formatTwitterTokensData(data)
    };
  }

  static processTwitterModifications(data) {
    // TODO: 处理推特异常修改历史数据的逻辑
    return {
      level: 'info',
      message: '推特异常修改检查完成',
      details: this.formatTwitterModificationsData(data)
    };
  }

  static processCreatorTokens(data) {
    // TODO: 处理创建者发币历史数据的逻辑
    return {
      level: 'info',
      message: '创建者发币历史检查完成',
      details: this.formatCreatorTokensData(data)
    };
  }

  // 添加静态的格式化市值方法
  static formatMarketCap(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    
    if (num >= 1000) {
      return `$${(num/1000).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}K`;
    }
    
    return `$${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  static getTokenRiskStyle(totalTokens, highValueTokens) {
    if (totalTokens > 0 && highValueTokens === 0) {
      return 'high-risk';
    } else if (highValueTokens === 1) {
      return 'medium-risk';
    } else if (highValueTokens > 1) {
      return 'low-risk';
    }
    return '';
  }

  static getModificationRiskStyle(totalModifications) {
    return totalModifications > 0 ? 'high-risk' : '';
  }

  static formatTwitterTokensData(data) {
    // 存储数据供分页使用
    this.currentData = data;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return `
        <div class="section-card">
          <h3 class="section-title">推特发币历史（最多获取最近10条记录）</h3>
          <div class="stats-grid no-data">
            <div class="stat-item">
              <span class="stat-value">未发现发币历史</span>
            </div>
          </div>
        </div>
      `;
    }

    // 计算统计信息
    const chainStats = data.reduce((acc, item) => {
      acc[item.chain_name] = (acc[item.chain_name] || 0) + 1;
      return acc;
    }, {});

    // 计算高市值代币数量
    const highMarketCapCount = data.filter(token => parseFloat(token.market_cap) > 10000).length;
    const totalTokens = data.length;

    const statsHtml = `
      <div class="stat-item">
        <span class="stat-label">市值>$10000的代币数量:</span>
        <span class="stat-value ${this.getTokenRiskStyle(totalTokens, highMarketCapCount)}">${highMarketCapCount} 个</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">总计发币次数:</span>
        <span class="stat-value">${totalTokens} 次</span>
      </div>
      ${Object.entries(chainStats).map(([chain, count]) => `
        <div class="stat-item">
          <span class="stat-label">${chain}:</span>
          <span class="stat-value">${count} 个代币</span>
        </div>
      `).join('')}
    `;

    // 分页配置
    const pageSize = 5;  // 每页显示5行
    const totalPages = Math.ceil(data.length / pageSize);

    // 修改分页控制HTML，改用data属性来传递方向
    const paginationHtml = `
      <div class="pagination">
        <button class="page-btn prev-btn" data-direction="prev" disabled>上一页</button>
        <span class="page-info">第 <span class="current-page">1</span>/${totalPages} 页</span>
        <button class="page-btn next-btn" data-direction="next" ${totalPages <= 1 ? 'disabled' : ''}>下一页</button>
      </div>
    `;

    // 使用类的静态方法
    const tableRows = data
      .slice(0, pageSize)
      .map(token => {
        return `
          <tr>
            <td>${token.chain_name}</td>
            <td>${token.token_symbol}</td>
            <td class="monospace">${token.token_address}</td>
            <td>${this.formatMarketCap(token.market_cap)}</td>
          </tr>
        `;
      }).join('');

    return `
      <div class="section-card">
        <h3 class="section-title">推特发币历史（最多获取最近10条记录）</h3>
        <div class="stats-grid warning-bg">
          ${statsHtml}
        </div>
        <div class="table-container" data-total-items="${data.length}" data-page-size="${pageSize}">
          <table class="tokens-table">
            <thead>
              <tr>
                <th>链</th>
                <th>代币符号</th>
                <th>合约地址</th>
                <th>市值</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          ${paginationHtml}
        </div>
      </div>
    `;
  }

  // 获取当前数据的方法
  static getCurrentData() {
    return this.currentData;
  }

  // 更新分页切换方法
  static changePage(button, direction) {
    const container = button.closest('.table-container');
    const type = container.dataset.type || 'tokens';  // 默认为tokens类型
    const data = type === 'modifications' ? this.currentModificationData : 
                 type === 'creator' ? this.currentCreatorData :
                 this.currentData;

    if (!data) return;

    const tbody = container.querySelector('tbody');
    const currentPageSpan = container.querySelector('.current-page');
    const prevBtn = container.querySelector('.prev-btn');
    const nextBtn = container.querySelector('.next-btn');
    
    const totalItems = parseInt(container.dataset.totalItems);
    const pageSize = parseInt(container.dataset.pageSize);  // 从 data 属性获取页面大小
    const totalPages = Math.ceil(totalItems / pageSize);
    const currentPage = parseInt(currentPageSpan.textContent);
    
    let newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
    
    // 更新页码
    currentPageSpan.textContent = newPage;
    
    // 更新按钮状态
    prevBtn.disabled = newPage === 1;
    nextBtn.disabled = newPage === totalPages;
    
    // 获取新页面的数据
    const start = (newPage - 1) * pageSize;
    const end = Math.min(start + pageSize, totalItems);

    // 根据表格类型生成不同的行内容
    let newRows;
    if (type === 'modifications') {
      newRows = data.slice(start, end).map(item => {
        const typeLabel = {
          'modify_description': '修改简介',
          'delete_tweet': '删除推文',
          'modify_name': '修改名称',
          'modify_profile': '修改头像'
        }[item.modify_type] || item.modify_type;

        // 使用相同的内容处理逻辑
        let modificationContent = item.modification_log;
        if (item.modify_type === 'modify_description') {
          modificationContent = modificationContent
            .replace('Raw Value:</br>', '')
            .replace(/\n/g, '<br>');
        } else if (item.modify_type === 'delete_tweet') {
          modificationContent = modificationContent
            .replace('Delete Tweet:</br>', '')
            .replace(/\n/g, '<br>');
        }

        return `
          <tr>
            <td>${typeLabel}</td>
            <td class="modification-content">${modificationContent}</td>
            <td>${item.gmt_modify}</td>
          </tr>
        `;
      }).join('');
    } else {
      newRows = data.slice(start, end).map(token => {
        return `
          <tr>
            <td>${token.chain_name}</td>
            <td>${token.token_symbol}</td>
            <td class="monospace">${token.token_address}</td>
            <td>${this.formatMarketCap(token.market_cap)}</td>
          </tr>
        `;
      }).join('');
    }
    
    tbody.innerHTML = newRows;
  }

  static formatTwitterModificationsData(data) {
    // 存储数据供分页使用
    this.currentModificationData = data;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return `
        <div class="section-card">
          <h3 class="section-title">推特异常修改历史</h3>
          <div class="stats-grid no-data">
            <div class="stat-item">
              <span class="stat-value">未发现异常修改记录</span>
            </div>
          </div>
        </div>
      `;
    }

    // 统计各类型修改的次数
    const typeStats = data.reduce((acc, item) => {
      acc[item.modify_type] = (acc[item.modify_type] || 0) + 1;
      return acc;
    }, {});

    // 生成统计信息HTML
    const totalModifications = data.length;
    const statsHtml = `
      <div class="stat-item">
        <span class="stat-label">总计修改次数:</span>
        <span class="stat-value ${this.getModificationRiskStyle(totalModifications)}">${totalModifications} 次</span>
      </div>
      ${Object.entries(typeStats).map(([type, count]) => {
        const typeLabel = {
          'modify_description': '修改简介',
          'delete_tweet': '删除推文',
          'modify_name': '修改名称',
          'modify_profile': '修改头像'
        }[type] || type;
        
        return `
          <div class="stat-item">
            <span class="stat-label">${typeLabel}:</span>
            <span class="stat-value">${count} 次</span>
          </div>
        `;
      }).join('')}
    `;

    // 分页配置
    const pageSize = 3;  // 修改为每页显示3行
    const totalPages = Math.ceil(data.length / pageSize);

    // 生成分页控制HTML
    const paginationHtml = `
      <div class="pagination">
        <button class="page-btn prev-btn" data-direction="prev" data-type="modifications" disabled>上一页</button>
        <span class="page-info">第 <span class="current-page">1</span>/${totalPages} 页</span>
        <button class="page-btn next-btn" data-direction="next" data-type="modifications" ${totalPages <= 1 ? 'disabled' : ''}>下一页</button>
      </div>
    `;

    // 修改表格内容生成部分
    const tableRows = data
      .slice(0, pageSize)
      .map(item => {
        const typeLabel = {
          'modify_description': '修改简介',
          'delete_tweet': '删除推文',
          'modify_name': '修改名称',
          'modify_profile': '修改头像'
        }[item.modify_type] || item.modify_type;

        // 改进修改内容的处理
        let modificationContent = item.modification_log;
        if (item.modify_type === 'modify_description') {
          // 对于修改简介，保留 Raw Value 后的内容
          modificationContent = modificationContent
            .replace(/\n/g, '<br>');  // 将换行符转换为HTML换行
        } else if (item.modify_type === 'delete_tweet') {
          // 对于删除推文，保留 Delete Tweet 后的内容
          modificationContent = modificationContent
            .replace(/\n/g, '<br>');  // 将换行符转换为HTML换行
        }

        return `
          <tr>
            <td>${typeLabel}</td>
            <td class="modification-content">${modificationContent}</td>
            <td>${item.gmt_modify}</td>
          </tr>
        `;
      }).join('');

    return `
      <div class="section-card">
        <h3 class="section-title">推特异常修改历史</h3>
        <div class="stats-grid warning-bg">
          ${statsHtml}
        </div>
        <div class="table-container" data-total-items="${data.length}" data-page-size="${pageSize}" data-type="modifications">
          <table class="tokens-table modifications-table">
            <thead>
              <tr>
                <th>修改类型</th>
                <th>修改内容</th>
                <th>修改时间</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          ${paginationHtml}
        </div>
      </div>
    `;
  }

  static formatCreatorTokensData(data) {
    // 存储数据供分页使用
    this.currentCreatorData = data;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return `
        <div class="section-card">
          <h3 class="section-title">创建者发币历史（最多获取最近10条记录）</h3>
          <div class="stats-grid no-data">
            <div class="stat-item">
              <span class="stat-value">未发现发币历史</span>
            </div>
          </div>
        </div>
      `;
    }

    // 计算统计信息
    const chainStats = data.reduce((acc, item) => {
      acc[item.chain_name] = (acc[item.chain_name] || 0) + 1;
      return acc;
    }, {});

    // 计算高市值代币数量
    const highMarketCapCount = data.filter(token => parseFloat(token.market_cap) > 10000).length;
    const totalTokens = data.length;

    const statsHtml = `
      <div class="stat-item">
        <span class="stat-label">市值>$10000的代币数量:</span>
        <span class="stat-value ${this.getTokenRiskStyle(totalTokens, highMarketCapCount)}">${highMarketCapCount} 个</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">总计发币次数:</span>
        <span class="stat-value">${totalTokens} 次</span>
      </div>
      ${Object.entries(chainStats).map(([chain, count]) => `
        <div class="stat-item">
          <span class="stat-label">${chain}:</span>
          <span class="stat-value">${count} 个代币</span>
        </div>
      `).join('')}
    `;

    // 分页配置
    const pageSize = 5;  // 每页显示5行
    const totalPages = Math.ceil(data.length / pageSize);

    // 生成分页控制HTML
    const paginationHtml = `
      <div class="pagination">
        <button class="page-btn prev-btn" data-direction="prev" data-type="creator" disabled>上一页</button>
        <span class="page-info">第 <span class="current-page">1</span>/${totalPages} 页</span>
        <button class="page-btn next-btn" data-direction="next" data-type="creator" ${totalPages <= 1 ? 'disabled' : ''}>下一页</button>
      </div>
    `;

    // 生成表格内容
    const tableRows = data
      .slice(0, pageSize)
      .map(token => {
        return `
          <tr>
            <td>${token.chain_name}</td>
            <td>${token.token_symbol}</td>
            <td class="monospace">${token.token_address}</td>
            <td>${this.formatMarketCap(token.market_cap)}</td>
          </tr>
        `;
      }).join('');

    return `
      <div class="section-card">
        <h3 class="section-title">创建者发币历史（最多获取最近10条记录）</h3>
        <div class="stats-grid warning-bg">
          ${statsHtml}
        </div>
        <div class="table-container" data-total-items="${data.length}" data-page-size="${pageSize}" data-type="creator">
          <table class="tokens-table">
            <thead>
              <tr>
                <th>链</th>
                <th>代币符号</th>
                <th>合约地址</th>
                <th>市值</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          ${paginationHtml}
        </div>
      </div>
    `;
  }

  static formatErrorData(message) {
    return `
      <div class="section-card error-section">
        <h3 class="section-title">错误信息</h3>
        <div class="error-message">${message}</div>
      </div>
    `;
  }

  // 执行所有分析
  static async analyze(pageData) {
    const results = {
      summary: [],
      details: {}
    };

    try {
      // 准备所有需要执行的规则检查
      const ruleChecks = [];
      
      // 推特发币历史检查
      if (pageData.twitter?.value) {
        ruleChecks.push({
          ruleId: 'checkTwitterTokens',
          promise: this.fetchTwitterTokens(pageData.twitter.value),
          processor: this.processTwitterTokens.bind(this)
        });
      }

      // 推特异常修改检查
      if (pageData.twitter?.value) {
        ruleChecks.push({
          ruleId: 'checkTwitterModifications',
          promise: this.fetchTwitterModifications(pageData.twitter.value),
          processor: this.processTwitterModifications.bind(this)
        });
      }

      // 创建者发币历史检查
      if (pageData.contract?.value && pageData.contract?.chain) {
        ruleChecks.push({
          ruleId: 'checkCreatorTokens',
          promise: this.fetchCreatorTokens(pageData.contract.chain, pageData.contract.value),
          processor: this.processCreatorTokens.bind(this)
        });
      }

      // 并行执行所有API请求
      const apiResults = await Promise.allSettled(ruleChecks.map(check => check.promise));

      // 处理每个规则的结果
      apiResults.forEach((result, index) => {
        const check = ruleChecks[index];
        const ruleName = this.rules[check.ruleId].name;

        let ruleResult;
        if (result.status === 'fulfilled') {
          // API调用成功
          ruleResult = check.processor(result.value);
        } else {
          // API调用失败
          console.error(`规则 ${check.ruleId} 执行失败:`, result.reason);
          ruleResult = {
            level: 'error',
            message: '规则执行失败',
            details: this.formatErrorData('API请求失败: ' + result.reason.message)
          };
        }

        // 保存结果
        results.details[check.ruleId] = {
          name: ruleName,
          ...ruleResult
        };

        results.summary.push({
          ruleId: check.ruleId,
          name: ruleName,
          level: ruleResult.level,
          message: ruleResult.message
        });
      });

      // 处理未执行的规则（比如因为缺少必要数据）
      for (const [ruleId, rule] of Object.entries(this.rules)) {
        if (!results.details[ruleId]) {
          const warningResult = {
            level: 'warning',
            message: '缺少必要数据',
            details: this.formatErrorData('缺少执行该规则所需的数据')
          };

          results.details[ruleId] = {
            name: rule.name,
            ...warningResult
          };

          results.summary.push({
            ruleId,
            name: rule.name,
            level: warningResult.level,
            message: warningResult.message
          });
        }
      }

    } catch (error) {
      console.error('规则执行过程中发生错误:', error);
      // 处理整体执行过程中的错误
      for (const [ruleId, rule] of Object.entries(this.rules)) {
        const errorResult = {
          level: 'error',
          message: '规则执行过程发生错误',
          details: this.formatErrorData('执行过程发生错误: ' + error.message)
        };

        results.details[ruleId] = {
          name: rule.name,
          ...errorResult
        };

        results.summary.push({
          ruleId,
          name: rule.name,
          level: errorResult.level,
          message: errorResult.message
        });
      }
    }

    return results;
  }

  // 添加事件监听器设置方法
  static setupPaginationListeners() {
    document.querySelectorAll('.page-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const direction = e.target.dataset.direction;
        if (direction) {
          this.changePage(e.target, direction);
        }
      });
    });
  }

  // 添加汇总信息格式化方法
  static formatSummaryData(analysisResults) {
    // 从三个接口的数据中提取信息
    const creatorData = this.currentCreatorData || [];
    const twitterData = this.currentData || [];
    const modificationData = this.currentModificationData || [];

    // 计算汇总统计
    const totalCreatorTokens = creatorData.length;
    const totalTwitterTokens = twitterData.length;
    const totalModifications = modificationData.length;

    // 计算高市值代币
    const highValueCreatorTokens = creatorData.filter(token => parseFloat(token.market_cap) > 10000).length;
    const highValueTwitterTokens = twitterData.filter(token => parseFloat(token.market_cap) > 10000).length;

    // 生成汇总HTML
    return `
      <div class="section-card summary-card">
        <h3 class="section-title">风险分析汇总</h3>
        <div class="stats-grid warning-bg">
          <div class="stat-item">
            <span class="stat-label">创建者发币总数（最多观察最近10次）:</span>
            <span class="stat-value">${totalCreatorTokens} 个</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">创建者高市值代币数(>$10000):</span>
            <span class="stat-value ${this.getTokenRiskStyle(totalCreatorTokens, highValueCreatorTokens)}">${highValueCreatorTokens} 个</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">推特发币总数:</span>
            <span class="stat-value">${totalTwitterTokens} 个</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">推特高市值代币数(>$10000):</span>
            <span class="stat-value ${this.getTokenRiskStyle(totalTwitterTokens, highValueTwitterTokens)}">${highValueTwitterTokens} 个</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">推特异常修改次数:</span>
            <span class="stat-value ${this.getModificationRiskStyle(totalModifications)}">${totalModifications} 次</span>
          </div>
        </div>
      </div>
    `;
  }

  // 修改 getResultHTML 方法
  static getResultHTML(analysisResults) {
    let html = '<div class="analysis-results">';
    
    // 添加汇总信息
    html += this.formatSummaryData(analysisResults);

    // 定义展示顺序
    const displayOrder = [
      'checkCreatorTokens',      // 创建者发币历史
      'checkTwitterModifications', // 推特异常修改历史
      'checkTwitterTokens'        // 推特发币历史
    ];

    // 按照指定顺序展示结果
    for (const ruleId of displayOrder) {
      const detail = analysisResults.details[ruleId];
      if (detail?.details) {
        html += `
          <div class="detail-section">
            ${detail.details}
          </div>
        `;
      }
    }
    html += '</div>';

    // 使用 setTimeout 确保 DOM 已更新
    setTimeout(() => {
      this.setupPaginationListeners();
    }, 0);
    
    return html;
  }
}

// 导出分析规则类
window.GMGNRules = GMGNRules;