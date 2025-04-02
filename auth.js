class Auth {
  constructor() {
    this.isLoggedIn = false;
    this.user = null;
    this.wallet = null;
    this.initUI();
    // 等待钱包加载完成
    this.waitForOKXWallet().then(() => {
      this.checkLoginStatus();
    });
  }

  initUI() {
    this.loginButton = document.querySelector('.login-button');
    this.userInfo = document.querySelector('.user-info');
    this.usernameSpan = document.querySelector('.username');
    this.logoutButton = document.querySelector('.logout-button');

    this.loginButton.addEventListener('click', () => this.connectWallet());
    this.logoutButton.addEventListener('click', () => this.logout());
  }

  // 等待 OKX 钱包加载
  waitForOKXWallet(maxAttempts = 10) {
    return new Promise((resolve) => {
      let attempts = 0;
      const checkWallet = () => {
        attempts++;
        if (window.okxwallet) {
          console.log('OKX 钱包已加载');
          resolve(true);
        } else if (attempts < maxAttempts) {
          console.log('等待 OKX 钱包加载...');
          setTimeout(checkWallet, 500);
        } else {
          console.log('OKX 钱包未检测到');
          resolve(false);
        }
      };
      checkWallet();
    });
  }

  async checkLoginStatus() {
    // 检查是否已经连接钱包
    if (window.okxwallet) {
      try {
        // 获取当前连接状态
        const provider = window.okxwallet.solana;
        const connected = await provider.isConnected();
        
        if (connected) {
          const publicKey = (await provider.getAccount()).address;
          this.updateUIStatus(true, {
            name: this.formatAddress(publicKey)
          });
          this.wallet = { publicKey };
        }
      } catch (error) {
        console.log('未连接钱包或已断开连接:', error);
      }
    }
  }

  async connectWallet() {
    try {
      // 先等待钱包加载
      const isWalletAvailable = await this.waitForOKXWallet();
      
      if (!isWalletAvailable) {
        window.open('https://www.okx.com/cn/web3', '_blank');
        alert('请先安装 OKX 钱包插件');
        return;
      }

      // 请求连接 Solana 钱包
      const provider = window.okxwallet.solana;
      
      try {
        // 请求用户授权连接
        await provider.connect();
        
        // 获取账户信息
        const account = await provider.getAccount();
        
        if (account.address) {
          this.wallet = { publicKey: account.address };
          this.updateUIStatus(true, {
            name: this.formatAddress(account.address)
          });
        } else {
          alert('连接钱包失败，请重试');
        }
      } catch (error) {
        if (error.code === 4001) {
          // 用户拒绝连接
          console.log('用户拒绝了连接请求');
        } else {
          alert('连接钱包失败，请确保已解锁 OKX 钱包');
        }
        throw error;
      }
    } catch (error) {
      console.error('连接钱包失败:', error);
    }
  }

  async logout() {
    try {
      if (window.okxwallet) {
        await window.okxwallet.solana.disconnect();
      }
      this.wallet = null;
      this.updateUIStatus(false, null);
    } catch (error) {
      console.error('登出失败:', error);
    }
  }

  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  updateUIStatus(isLoggedIn, user) {
    this.isLoggedIn = isLoggedIn;
    this.user = user;

    if (isLoggedIn && user) {
      this.loginButton.style.display = 'none';
      this.userInfo.classList.add('logged-in');
      this.usernameSpan.textContent = user.name;
    } else {
      this.loginButton.style.display = 'block';
      this.userInfo.classList.remove('logged-in');
      this.usernameSpan.textContent = '';
    }
  }

  // 获取当前钱包状态
  getWalletStatus() {
    return {
      isLoggedIn: this.isLoggedIn,
      wallet: this.wallet
    };
  }
}

// 初始化认证模块
window.auth = new Auth(); 