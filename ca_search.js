class CASearch {
  static lastRequestTime = 0;
  static lastData = null;
  static isDragging = false;
  static dragOffset = { x: 0, y: 0 };
  static lastContractAddress = null;
  static isModalVisible = false;

  static updateButtonState(state) {
    const monitorBtn = document.getElementById('monitorBtn');
    if (!monitorBtn) return;

    // 移除所有可能的类名
    monitorBtn.classList.remove('loading', 'loaded');

    switch (state) {
      case 'loading':
        monitorBtn.classList.add('loading');
        monitorBtn.innerHTML = '<div class="loading-circle"></div>';
        break;
      case 'loaded':
        monitorBtn.classList.add('loaded');
        monitorBtn.innerHTML = '<div class="btn-text">推特</br>热度</div>';
        break;
      default:
        monitorBtn.innerHTML = '<div class="btn-text">推特</br>热度</div>';
    }
  }


  static async searchTwitterByCA() {
    // 检查是否可以使用缓存数据
    const now = Date.now();

    try {
      // 正确获取合约地址
      const storage = await chrome.storage.local.get(['contractAddress', 'walletAddress', 'token']);
      const { contractAddress, walletAddress, token } = storage;

      if (!contractAddress) {
        throw new Error('未能获取当前合约地址');
      }

      // 只有当合约地址相同时才使用缓存
      if (this.lastData &&
          this.lastContractAddress === contractAddress &&
          (now - this.lastRequestTime < 60000)) {
        return {
          success: true,
          data: this.lastData,
          fromCache: true
        };
      }

      console.log("Sending search request to backend...");

      console.log("get_search_result-->token:" + token);
      console.log("get_search_result-->contractAddress:" + contractAddress);
      console.log("get_search_result-->walletAddress:" + walletAddress);

      const response = await fetch('https://pumptools.me/api/extension/get_search_result', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Origin': chrome.runtime.getURL('')
          },
          credentials: 'include',
          body: JSON.stringify({
              query_word: contractAddress,
              user_address: walletAddress,
              user_id: walletAddress,
              ca_address: contractAddress
          })
      });

      let responseText = await response.text();
      console.log('Response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("JSON parse error:", e);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`);
      }

      // 更新缓存数据和时间
      this.lastData = data;
      this.lastRequestTime = now;
      this.lastContractAddress = contractAddress;

      return {
        success: true,
        data: data,
        fromCache: false
      };
    } catch (error) {
      console.error('搜索合约推特失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static createModal(content) {
    // 移除已存在的弹层
    const existingModal = document.querySelector('.twitter-modal-overlay');
    if (existingModal) {
      console.log('Removing existing modal');
      existingModal.remove();
      this.isModalVisible = false;
      // 如果当前是要隐藏弹层，直接返回
      if (!content) {
        console.log('No content provided, returning');
        return;
      }
    }

    // 如果提供了 content，创建新的弹层
    const modal = document.createElement('div');
    modal.className = 'twitter-modal-overlay';
    modal.innerHTML = content;
    document.body.appendChild(modal);
    this.isModalVisible = true;
    console.log('Modal created and displayed');

    // 绑定关闭事件
    const closeBtn = modal.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log('Close button clicked');
        modal.remove();
        this.isModalVisible = false;
      });
    }

    // 点击遮罩层关闭弹窗
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        console.log('Overlay clicked, closing modal');
        modal.remove();
        this.isModalVisible = false;
      }
    });
  }

  static toggleModal(content) {
    if (this.isModalVisible) {
      console.log('Modal is visible, closing it');
      this.createModal(null);
    } else {
      console.log('Modal is not visible, opening it');
      this.createModal(content);
    }
  }

  static showLoading() {
    this.createModal(`
      <div class="twitter-modal">
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <span>正在获取推特数据，请稍等...</span>
        </div>
      </div>
      <style>
        .twitter-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
        }
        .twitter-modal {
          background: white;
          border-radius: 16px;
          padding: 24px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 32px;
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #1a73e8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `);
  }

  static formatTwitterInfo(data) {
    try {
      // 如果 data 是字符串，需要解析它
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const timeSeriesData = parsedData.x;
      const sysData = typeof parsedData.sys === 'string' ? JSON.parse(parsedData.sys) : parsedData.sys;

      // 获取最新的累计数据
      const latestData = Object.values(timeSeriesData)[Object.values(timeSeriesData).length - 1].cumulative;

      // 转换时序数据为数组并排序（倒序，最新的在前面）
      const sortedTimeData = Object.entries(timeSeriesData)
        .sort(([timeA], [timeB]) => new Date(timeB) - new Date(timeA))
        .slice(0, 20); // 只保留最近20条数据

      // 生成表格行HTML
      const generateTableRowsHtml = (data) => {
        return data.map(([time, data]) => {
          const tweetUrl = data.point.tweet_url;
          const profileImage = data.point.profile_image;
          const username = tweetUrl ? tweetUrl.split('/')[3] : '';
          const userFollowers = data.point.user_followers;

          return `
            <tr>
              <td class="time-cell">${new Date(time).toLocaleString('zh-CN', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }).replace(/\//g, '-')}</td>
              <td>${data.cumulative.tweet_count}</td>
              <td>${data.cumulative.total_engagement}</td>
              <td>${data.cumulative.total_followers.toLocaleString()}</td>
              <td>
                ${profileImage ? `
                  <div class="user-info">
                    <a href="${tweetUrl}" target="_blank" class="user-link">
                      <img src="${profileImage}" alt="avatar" class="user-avatar">
                      <span class="user-name">${username}</span>
                    </a>
                    ${userFollowers ? `<span class="user-followers">${userFollowers.toLocaleString()} 粉丝</span>` : ''}
                  </div>
                ` : '-'}
              </td>
            </tr>
          `;
        }).join('');
      };

      return `


        <div class="twitter-modal">
         <div class="system-stats">

          <div class="twitter-header">
            <h3>推特热度（至多最近100条）</h3>
            <span class="close-btn">×</span>
          </div>

          <div class="stat-label">历史查询统计</div>
              <div class="sys-data">
                <span>总查询用户: ${sysData.total_users}</span>
                <span>总查询次数: ${sysData.total_queries}</span>
              </div>
          </div>

          <div class="twitter-stats">
            <div class="stat-item">
              <div class="stat-label">总推文数</div>
              <div class="stat-value">${latestData.tweet_count}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">认证用户</div>
              <div class="stat-value">${latestData.blue_verified_count}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">KOL数量</div>
              <div class="stat-value">${latestData.kol_count}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">潜在卖家</div>
              <div class="stat-value">${latestData.total_followers.toLocaleString()}</div>
            </div>
          </div>

          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>累计<br>推文</th>
                  <th>累计<br>互动</th>
                  <th>累计<br>粉丝</th>
                  <th>用户<br>信息</th>
                </tr>
              </thead>
              <tbody>
                ${generateTableRowsHtml(sortedTimeData)}
              </tbody>
            </table>
          </div>


        </div>
        <style>
          .data-table-container {
            margin: 12px;
            border-radius: 8px;
            background: white;
            overflow-x: auto;
          }

          .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            white-space: nowrap;
          }

          .data-table th,
          .data-table td {
            padding: 6px;
            text-align: center;
            border: 1px solid #eee;
          }

          // 数字展示的样式
          .data-table td:nth-child(2),
          .data-table td:nth-child(3),
          .data-table td:nth-child(4) {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
            font-size: 11px;
          }

          .data-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #666;
            position: sticky;
            top: 0;
            z-index: 1;
          }

          .data-table tbody tr:hover {
            background-color: #f5f8fa;
          }

          .time-cell {
            color: #666;
          }

          .user-link {
            display: flex;
            align-items: center;
            gap: 4px;
            text-decoration: none;
            color: inherit;
          }

          .user-avatar {
            width: 20px;
            height: 20px;
            border-radius: 50%;
          }

          .user-name {
            color: #1da1f2;
            font-size: 13px;
          }

          .user-info {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          .user-followers {
            font-size: 11px;
            color: #666;
            white-space: nowrap;
          }

          .twitter-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.3);
            display: flex;
            justify-content: center;
            align-items: center;
            pointer-events: auto;
            z-index: 10000;
          }

          .twitter-modal {
            pointer-events: auto;
            background: white;
            border-radius: 8px;
            width: 380px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            position: relative;
          }

          .twitter-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            border-bottom: 1px solid #eee;
            position: sticky;
            top: 0;
            background: white;
            z-index: 1;
          }
          .twitter-header h3 {
            margin: 0;
            color: #1a73e8;
            font-size: 16px;
            font-weight: 600;
          }
          .close-btn {
            cursor: pointer;
            font-size: 18px;
            color: #666;
            padding: 4px;
          }
          .twitter-stats {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            padding: 12px;
            background: #f8f9fa;
            margin: 8px;
            border-radius: 8px;
          }
          .stat-item {
            text-align: center;
            padding: 12px;
            background: white;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .stat-label {
            font-size: 13px;
            color: #666;
            margin-bottom: 4px;
          }
          .stat-value {
            font-size: 16px;
            font-weight: 600;
            color: #1a73e8;
          }
          .system-stats {
            margin: 12px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
          }
          .sys-data {
            display: flex;
            justify-content: space-around;
            margin-top: 8px;
            font-size: 12px;
            color: #666;
          }
        </style>
      `;
    } catch (error) {
      console.error('Error formatting Twitter info:', error);
      return `
        <div class="twitter-modal">
          <div class="twitter-header">
            <h3>错误提示</h3>
            <span class="close-btn">×</span>
          </div>
          <div class="error-content">
            ❌ 数据格式化失败: ${error.message}
          </div>
        </div>
      `;
    }
  }

  static updateUI(result) {
    if (!result.success) {
      this.updateButtonState('default');
      this.createModal(this.formatTwitterInfo(result.data));
      return;
    }

    this.updateButtonState('loaded');
    this.createModal(this.formatTwitterInfo(result.data));
  }
}

// 监听按钮点击事件
document.addEventListener('DOMContentLoaded', () => {
  const monitorBtn = document.getElementById('monitorBtn');
  if (monitorBtn) {
    // 在 DOMContentLoaded 事件监听器中更新样式
    const style = document.createElement('style');
    style.textContent = `
      #monitorBtn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: linear-gradient(135deg, #1a73e8, #0d47a1);
        box-shadow: 0 2px 12px rgba(26, 115, 232, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: none;
        padding: 0;
        z-index: 9999;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      #monitorBtn::before {
        content: '';
        position: absolute;
        top: -1px;
        left: -1px;
        right: -1px;
        bottom: -1px;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0));
        z-index: -1;
      }

      #monitorBtn:hover {
        transform: scale(1.05) translateY(-2px);
        box-shadow: 0 4px 15px rgba(26, 115, 232, 0.3);
        background: linear-gradient(135deg, #1e88e5, #1565c0);
      }

      #monitorBtn:active {
        transform: scale(0.95);
      }

      .btn-text {
        color: white;
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.4px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      #monitorBtn.loading {
        background: linear-gradient(135deg, #64b5f6, #42a5f5);
        cursor: wait;
      }

      #monitorBtn.loading .loading-circle {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      #monitorBtn.loaded {
        background: linear-gradient(135deg, #43a047, #2e7d32);
        animation: bounce 1s ease infinite;
      }

      #monitorBtn.loaded:hover {
        background: linear-gradient(135deg, #4caf50, #388e3c);
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
    `;
    document.head.appendChild(style);

    monitorBtn.addEventListener('click', async () => {
      console.log('Monitor button clicked');
      // 如果按钮处于loaded状态，切换浮层显示状态
      if (monitorBtn.classList.contains('loaded')) {
        monitorBtn.style.animation = 'none';
        if (CASearch.isModalVisible) {
          // 如果浮层已显示，则关闭它
          CASearch.createModal(null);
        } else {
          // 如果浮层未显示，则显示它
          const content = CASearch.formatTwitterInfo(CASearch.lastData);
          CASearch.toggleModal(content);
        }
        return;
      }

      // 显示加载状态
      CASearch.updateButtonState('loading');

      // 调用API获取推特数据
      const result = await CASearch.searchTwitterByCA();

      // 更新UI显示结果
      CASearch.updateUI(result);
    });
  }
});