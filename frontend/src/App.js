import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [portfolios, setPortfolios] = useState([]);
  const [sentimentData, setSentimentData] = useState([]);
  const [yieldOpportunities, setYieldOpportunities] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [riskMetrics, setRiskMetrics] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  const userId = "demo-user-123"; // In real app, this would come from authentication

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/dashboard/${userId}`);
      setDashboardData(response.data);
      setPortfolios(response.data.portfolios || []);
      setSentimentData(response.data.sentiment_data || []);
      setYieldOpportunities(response.data.yield_opportunities || []);
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPortfolio = async () => {
    if (!walletAddress) {
      alert('Please enter a wallet address');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API}/portfolio/create`, {
        user_id: userId,
        wallet_address: walletAddress
      });
      
      setPortfolios([...portfolios, response.data]);
      setWalletAddress('');
      alert('Portfolio created successfully!');
      loadDashboardData();
    } catch (error) {
      console.error('Error creating portfolio:', error);
      alert('Error creating portfolio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeRisk = async (portfolioId) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/portfolio/${portfolioId}/risk-analysis`, {
        portfolio_id: portfolioId,
        time_period: 30
      });
      setRiskMetrics(response.data);
    } catch (error) {
      console.error('Error analyzing risk:', error);
      alert('Error analyzing risk. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeSentiment = async () => {
    try {
      setLoading(true);
      const symbols = ['BTC', 'ETH', 'LINK', 'UNI'];
      const response = await axios.post(`${API}/sentiment/analyze`, {
        symbols: symbols,
        sources: ['news', 'reddit']
      });
      setSentimentData(response.data);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      alert('Error analyzing sentiment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadYieldOpportunities = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/yield-opportunities`);
      setYieldOpportunities(response.data);
    } catch (error) {
      console.error('Error loading yield opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskScore) => {
    if (riskScore < 30) return 'text-green-600';
    if (riskScore < 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSentimentColor = (sentiment) => {
    if (sentiment > 0.2) return 'text-green-600';
    if (sentiment > -0.2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercent = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const DashboardView = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800">Total Portfolio Value</h3>
          <p className="text-2xl font-bold text-blue-600">
            {dashboardData?.summary?.total_portfolio_value ? formatCurrency(dashboardData.summary.total_portfolio_value) : '$0'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800">Portfolios</h3>
          <p className="text-2xl font-bold text-green-600">{dashboardData?.summary?.portfolio_count || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800">Average Risk Score</h3>
          <p className={`text-2xl font-bold ${getRiskColor(dashboardData?.summary?.avg_risk_score || 0)}`}>
            {dashboardData?.summary?.avg_risk_score?.toFixed(1) || '0.0'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800">Active Alerts</h3>
          <p className="text-2xl font-bold text-red-600">{dashboardData?.summary?.total_alerts || 0}</p>
        </div>
      </div>

      {/* Recent Portfolios */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Portfolios</h3>
        <div className="space-y-4">
          {portfolios.slice(0, 3).map((portfolio) => (
            <div key={portfolio.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-semibold">{portfolio.wallet_address.slice(0, 8)}...{portfolio.wallet_address.slice(-6)}</p>
                <p className="text-sm text-gray-600">{portfolio.tokens?.length || 0} tokens</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{formatCurrency(portfolio.total_value_usd)}</p>
                <p className={`text-sm ${getRiskColor(portfolio.risk_score)}`}>
                  Risk: {portfolio.risk_score.toFixed(1)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sentiment */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Market Sentiment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sentimentData.slice(0, 4).map((sentiment) => (
            <div key={sentiment.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{sentiment.symbol}</span>
                <span className={`text-sm ${getSentimentColor(sentiment.sentiment_score)}`}>
                  {sentiment.sentiment_score > 0 ? 'Positive' : sentiment.sentiment_score < 0 ? 'Negative' : 'Neutral'}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Confidence: {(sentiment.confidence * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">
                Volume: {sentiment.volume}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const PortfolioView = () => (
    <div className="space-y-6">
      {/* Create Portfolio */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Create New Portfolio</h3>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Enter wallet address (0x...)"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="flex-1 p-2 border rounded-lg"
          />
          <button
            onClick={createPortfolio}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Portfolio'}
          </button>
        </div>
      </div>

      {/* Portfolio List */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Portfolios</h3>
        <div className="space-y-4">
          {portfolios.map((portfolio) => (
            <div key={portfolio.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-lg">
                    {portfolio.wallet_address.slice(0, 10)}...{portfolio.wallet_address.slice(-8)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Created: {new Date(portfolio.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(portfolio.total_value_usd)}
                  </p>
                  <p className={`text-sm ${getRiskColor(portfolio.risk_score)}`}>
                    Risk Score: {portfolio.risk_score.toFixed(1)}
                  </p>
                </div>
              </div>
              
              {/* Token Holdings */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {portfolio.tokens?.map((token) => (
                  <div key={token.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{token.symbol}</span>
                      <span className={`text-sm ${token.change_24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(token.change_24h)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{token.balance.toFixed(4)} {token.symbol}</p>
                    <p className="font-semibold">{formatCurrency(token.value_usd)}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setSelectedPortfolio(portfolio);
                    analyzeRisk(portfolio.id);
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Analyze Risk
                </button>
                <button
                  onClick={() => setSelectedPortfolio(portfolio)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Analysis Results */}
      {riskMetrics && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Risk Analysis Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800">Value at Risk (95%)</h4>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(riskMetrics.value_at_risk)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800">Sharpe Ratio</h4>
              <p className="text-2xl font-bold text-blue-600">
                {riskMetrics.sharpe_ratio.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800">Volatility</h4>
              <p className="text-2xl font-bold text-yellow-600">
                {formatPercent(riskMetrics.volatility * 100)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800">Max Drawdown</h4>
              <p className="text-2xl font-bold text-red-600">
                {formatPercent(riskMetrics.max_drawdown * 100)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800">Sortino Ratio</h4>
              <p className="text-2xl font-bold text-green-600">
                {riskMetrics.sortino_ratio.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800">Conditional VaR</h4>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(riskMetrics.conditional_var)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const SentimentView = () => (
    <div className="space-y-6">
      {/* Sentiment Analysis Controls */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Market Sentiment Analysis</h3>
        <button
          onClick={analyzeSentiment}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Analyze Sentiment'}
        </button>
      </div>

      {/* Sentiment Results */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Sentiment Results</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sentimentData.map((sentiment) => (
            <div key={sentiment.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold">{sentiment.symbol}</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  sentiment.sentiment_score > 0.2 ? 'bg-green-100 text-green-800' :
                  sentiment.sentiment_score < -0.2 ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {sentiment.sentiment_score > 0.2 ? 'Positive' : 
                   sentiment.sentiment_score < -0.2 ? 'Negative' : 'Neutral'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sentiment Score:</span>
                  <span className={`font-semibold ${getSentimentColor(sentiment.sentiment_score)}`}>
                    {sentiment.sentiment_score.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Confidence:</span>
                  <span className="font-semibold">{(sentiment.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Volume:</span>
                  <span className="font-semibold">{sentiment.volume}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Source:</span>
                  <span className="font-semibold capitalize">{sentiment.source}</span>
                </div>
              </div>
              {sentiment.text_sample && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{sentiment.text_sample}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const YieldView = () => (
    <div className="space-y-6">
      {/* Yield Opportunities Controls */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Yield Farming Opportunities</h3>
        <button
          onClick={loadYieldOpportunities}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh Opportunities'}
        </button>
      </div>

      {/* Yield Opportunities */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Current Opportunities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {yieldOpportunities.map((opportunity) => (
            <div key={opportunity.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold">{opportunity.protocol}</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  opportunity.risk_score < 2 ? 'bg-green-100 text-green-800' :
                  opportunity.risk_score < 4 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  Risk: {opportunity.risk_score.toFixed(1)}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Token Pair:</span>
                  <span className="font-semibold">{opportunity.token_pair}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">APY:</span>
                  <span className="font-semibold text-green-600">{opportunity.apy.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">TVL:</span>
                  <span className="font-semibold">{formatCurrency(opportunity.tvl)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">24h Fees:</span>
                  <span className="font-semibold">{formatCurrency(opportunity.fees_24h)}</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  Pool: {opportunity.pool_address.slice(0, 10)}...{opportunity.pool_address.slice(-8)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img 
                src="https://images.unsplash.com/photo-1658824224587-6bd07d3b913f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwxfHxkZWZpfGVufDB8fHxibHVlfDE3NTI0MzA0MTF8MA&ixlib=rb-4.1.0&q=85" 
                alt="DeFi Logo" 
                className="h-8 w-8 rounded-lg mr-3"
              />
              <h1 className="text-2xl font-bold text-gray-900">DeFi Risk Manager</h1>
            </div>
            <div className="text-sm text-gray-600">
              Connected: {userId}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <nav className="mb-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'portfolio', label: 'Portfolios', icon: '💼' },
              { id: 'sentiment', label: 'Sentiment', icon: '📈' },
              { id: 'yield', label: 'Yield Farming', icon: '🌾' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <main>
          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Processing...</p>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'portfolio' && <PortfolioView />}
          {activeTab === 'sentiment' && <SentimentView />}
          {activeTab === 'yield' && <YieldView />}
        </main>
      </div>
    </div>
  );
};

export default App;