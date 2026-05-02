import React from 'react';
import ReactDOM from 'react-dom/client';
import AppContainer from './AppContainer';
import { ApiProvider } from './contexts/ApiContext';

/**
 * 主应用组件
 * 提供API上下文和全局配置
 */
function App() {
  // 从localStorage获取初始环境，默认为development
  const initialEnvironment = localStorage.getItem('api_environment') || 'development';

  return (
    <React.StrictMode>
      <ApiProvider initialEnvironment={initialEnvironment}>
        <AppContainer />
      </ApiProvider>
    </React.StrictMode>
  );
}

export default App;