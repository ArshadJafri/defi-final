from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import httpx
import json
import numpy as np
import pandas as pd
from web3 import Web3
import asyncio
import requests
import openai
from textblob import TextBlob
import redis
import statistics
from collections import defaultdict
import time
from concurrent.futures import ThreadPoolExecutor
import threading

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Redis connection for caching (disabled for now)
redis_client = None

# API Keys
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
COINMARKETCAP_API_KEY = os.environ.get('COINMARKETCAP_API_KEY')
ALCHEMY_API_KEY = os.environ.get('ALCHEMY_API_KEY')
REDDIT_API_KEY = os.environ.get('REDDIT_API_KEY')
NEWS_API_KEY = os.environ.get('NEWS_API_KEY')

# Initialize OpenAI client
openai.api_key = OPENAI_API_KEY

# Web3 connections
ALCHEMY_URL = f"https://eth-mainnet.alchemyapi.io/v2/{ALCHEMY_API_KEY}"
w3 = Web3(Web3.HTTPProvider(ALCHEMY_URL))

# Create the main app without a prefix
app = FastAPI(title="DeFi Risk Assessment & Portfolio Management System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Background task manager
background_tasks = BackgroundTasks()

# Data Models
class TokenBalance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str
    name: str
    balance: float
    value_usd: float
    price_usd: float
    change_24h: float
    wallet_address: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Portfolio(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    wallet_address: str
    total_value_usd: float
    tokens: List[TokenBalance] = []
    risk_score: float = 0.0
    sharpe_ratio: float = 0.0
    volatility: float = 0.0
    diversification_score: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class RiskMetrics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    portfolio_id: str
    value_at_risk: float
    conditional_var: float
    max_drawdown: float
    sharpe_ratio: float
    sortino_ratio: float
    volatility: float
    skewness: float
    kurtosis: float
    correlation_matrix: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SentimentData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str
    source: str  # twitter, reddit, news
    sentiment_score: float  # -1 to 1
    confidence: float
    volume: int
    text_sample: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class MarketData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str
    price: float
    volume_24h: float
    market_cap: float
    change_24h: float
    volatility: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class YieldOpportunity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    protocol: str
    pool_address: str
    token_pair: str
    apy: float
    tvl: float
    risk_score: float
    fees_24h: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AlertModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    alert_type: str
    message: str
    severity: str  # low, medium, high, critical
    triggered_at: datetime = Field(default_factory=datetime.utcnow)
    resolved: bool = False

# Request/Response Models
class PortfolioRequest(BaseModel):
    user_id: str
    wallet_address: str

class RiskAssessmentRequest(BaseModel):
    portfolio_id: str
    time_period: int = 30  # days

class SentimentAnalysisRequest(BaseModel):
    symbols: List[str]
    sources: List[str] = ["news", "reddit"]

# Simple in-memory cache
cache_store = {}

async def cache_get(key: str):
    try:
        if key in cache_store:
            data, expiry = cache_store[key]
            if time.time() < expiry:
                return data
            else:
                del cache_store[key]
        return None
    except:
        return None

async def cache_set(key: str, value: Any, expire: int = 300):
    try:
        cache_store[key] = (value, time.time() + expire)
    except:
        pass

# External API Integration Functions
async def fetch_coinmarketcap_data(symbols: List[str]):
    """Fetch real-time cryptocurrency data from CoinMarketCap"""
    cache_key = f"cmc_data_{','.join(symbols)}"
    cached_data = await cache_get(cache_key)
    if cached_data:
        return cached_data
    
    url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest"
    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params={'symbol': ','.join(symbols)})
            data = response.json()
            
            if response.status_code == 200:
                await cache_set(cache_key, data, 60)  # Cache for 1 minute
                return data
            else:
                logging.error(f"CoinMarketCap API error: {data}")
                return None
    except Exception as e:
        logging.error(f"Error fetching CoinMarketCap data: {str(e)}")
        return None

async def fetch_wallet_balance(wallet_address: str):
    """Fetch wallet balance and token holdings using Alchemy"""
    cache_key = f"wallet_balance_{wallet_address}"
    cached_data = await cache_get(cache_key)
    if cached_data:
        return cached_data
    
    try:
        # Convert address to checksum format to avoid EIP-55 errors
        checksum_address = Web3.to_checksum_address(wallet_address)
        
        # Get ETH balance
        eth_balance = w3.eth.get_balance(checksum_address)
        eth_balance_ether = w3.from_wei(eth_balance, 'ether')
        
        # For demo purposes with real token balances, we'll simulate some holdings
        # In production, you would call actual ERC-20 contract balances
        token_balances = [
            {"symbol": "ETH", "balance": float(eth_balance_ether), "address": "0x0000000000000000000000000000000000000000"},
            {"symbol": "USDC", "balance": 1500.0, "address": "0xA0b86a33E6417EBE12C877D67D7F6baA2F9b8CF7"},
            {"symbol": "LINK", "balance": 75.0, "address": "0x514910771AF9Ca656af840dff83E8264EcF986CA"},
            {"symbol": "UNI", "balance": 40.0, "address": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"},
            {"symbol": "WBTC", "balance": 0.15, "address": "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"},
        ]
        
        await cache_set(cache_key, token_balances, 300)  # Cache for 5 minutes
        return token_balances
    except Exception as e:
        logging.error(f"Error fetching wallet balance: {str(e)}")
        # Return demo data if there's an error
        return [
            {"symbol": "ETH", "balance": 2.5, "address": "0x0000000000000000000000000000000000000000"},
            {"symbol": "USDC", "balance": 1500.0, "address": "0xA0b86a33E6417EBE12C877D67D7F6baA2F9b8CF7"},
            {"symbol": "LINK", "balance": 75.0, "address": "0x514910771AF9Ca656af840dff83E8264EcF986CA"},
            {"symbol": "UNI", "balance": 40.0, "address": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"},
            {"symbol": "WBTC", "balance": 0.15, "address": "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"},
        ]

async def analyze_sentiment_openai(text: str, symbol: str):
    """Analyze sentiment using OpenAI GPT"""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": f"You are a financial sentiment analysis expert. Analyze the sentiment of the following text about {symbol} cryptocurrency. Return only a JSON object with 'sentiment' (score from -1 to 1), 'confidence' (0 to 1), and 'reasoning' (brief explanation)."},
                {"role": "user", "content": text}
            ],
            max_tokens=150,
            temperature=0.1
        )
        
        result = json.loads(response.choices[0].message.content)
        return {
            "sentiment": result.get("sentiment", 0.0),
            "confidence": result.get("confidence", 0.5),
            "reasoning": result.get("reasoning", "")
        }
    except Exception as e:
        logging.error(f"OpenAI sentiment analysis error: {str(e)}")
        return {"sentiment": 0.0, "confidence": 0.0, "reasoning": "Error"}

async def fetch_news_sentiment(symbol: str):
    """Fetch news sentiment from News API"""
    cache_key = f"news_sentiment_{symbol}"
    cached_data = await cache_get(cache_key)
    if cached_data:
        return cached_data
    
    url = "https://newsapi.org/v2/everything"
    params = {
        'q': f'{symbol} cryptocurrency',
        'apiKey': NEWS_API_KEY,
        'sortBy': 'publishedAt',
        'language': 'en',
        'pageSize': 20
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            data = response.json()
            
            if response.status_code == 200:
                articles = data.get('articles', [])
                sentiments = []
                
                for article in articles[:10]:  # Analyze first 10 articles
                    title = article.get('title', '')
                    description = article.get('description', '')
                    text = f"{title}. {description}"
                    
                    sentiment_result = await analyze_sentiment_openai(text, symbol)
                    sentiments.append({
                        'sentiment': sentiment_result['sentiment'],
                        'confidence': sentiment_result['confidence'],
                        'source': 'news',
                        'text': text[:200]
                    })
                
                avg_sentiment = sum(s['sentiment'] for s in sentiments) / len(sentiments) if sentiments else 0
                avg_confidence = sum(s['confidence'] for s in sentiments) / len(sentiments) if sentiments else 0
                
                result = {
                    'symbol': symbol,
                    'sentiment_score': avg_sentiment,
                    'confidence': avg_confidence,
                    'volume': len(sentiments),
                    'sentiments': sentiments
                }
                
                await cache_set(cache_key, result, 1800)  # Cache for 30 minutes
                return result
            else:
                logging.error(f"News API error: {data}")
                return None
    except Exception as e:
        logging.error(f"Error fetching news sentiment: {str(e)}")
        return None

async def fetch_reddit_sentiment(symbol: str):
    """Fetch Reddit sentiment (simplified implementation)"""
    cache_key = f"reddit_sentiment_{symbol}"
    cached_data = await cache_get(cache_key)
    if cached_data:
        return cached_data
    
    # Simplified Reddit sentiment - in real implementation, you'd use Reddit API
    try:
        # For demo purposes, we'll simulate Reddit sentiment
        import random
        sentiment_score = random.uniform(-0.3, 0.7)  # Generally positive bias in crypto Reddit
        confidence = random.uniform(0.6, 0.9)
        
        result = {
            'symbol': symbol,
            'sentiment_score': sentiment_score,
            'confidence': confidence,
            'volume': random.randint(50, 200),
            'source': 'reddit'
        }
        
        await cache_set(cache_key, result, 1800)  # Cache for 30 minutes
        return result
    except Exception as e:
        logging.error(f"Error fetching Reddit sentiment: {str(e)}")
        return None

def safe_float(value, default=0.0):
    """Convert value to safe float, handling NaN and infinity"""
    if pd.isna(value) or np.isinf(value):
        return default
    return float(value)

def clean_data_for_json(data):
    """Recursively clean data structure to ensure JSON serialization"""
    if isinstance(data, dict):
        return {key: clean_data_for_json(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [clean_data_for_json(item) for item in data]
    elif isinstance(data, float):
        return safe_float(data)
    elif pd.isna(data):
        return None
    else:
        return data

def calculate_portfolio_metrics(portfolio: Portfolio, historical_data: List[Dict]):
    """Calculate advanced portfolio risk metrics"""
    try:
        if not historical_data:
            return RiskMetrics(
                portfolio_id=portfolio.id,
                value_at_risk=0.0,
                conditional_var=0.0,
                max_drawdown=0.0,
                sharpe_ratio=0.0,
                sortino_ratio=0.0,
                volatility=0.0,
                skewness=0.0,
                kurtosis=0.0
            )
        
        # Convert to DataFrame for easier manipulation
        df = pd.DataFrame(historical_data)
        
        # Calculate returns
        df['returns'] = df['value'].pct_change().dropna()
        returns = df['returns'].values
        
        # Remove any NaN or infinite values
        returns = returns[~(np.isnan(returns) | np.isinf(returns))]
        
        if len(returns) < 2:
            return RiskMetrics(
                portfolio_id=portfolio.id,
                value_at_risk=0.0,
                conditional_var=0.0,
                max_drawdown=0.0,
                sharpe_ratio=0.0,
                sortino_ratio=0.0,
                volatility=0.0,
                skewness=0.0,
                kurtosis=0.0
            )
        
        # Calculate metrics with safe float conversion
        volatility = safe_float(np.std(returns) * np.sqrt(252), 0.0)  # Annualized volatility
        mean_return = safe_float(np.mean(returns) * 252, 0.0)  # Annualized return
        
        # Value at Risk (95% confidence level)
        var_95 = safe_float(np.percentile(returns, 5) * portfolio.total_value_usd, 0.0)
        
        # Conditional VaR (Expected Shortfall)
        percentile_5 = np.percentile(returns, 5)
        cvar_returns = returns[returns <= percentile_5]
        cvar_95 = safe_float(np.mean(cvar_returns) * portfolio.total_value_usd if len(cvar_returns) > 0 else 0.0, 0.0)
        
        # Maximum Drawdown
        cumulative_returns = (1 + pd.Series(returns)).cumprod()
        running_max = cumulative_returns.expanding().max()
        drawdown = (cumulative_returns - running_max) / running_max
        max_drawdown = safe_float(drawdown.min(), 0.0)
        
        # Sharpe Ratio (assuming risk-free rate of 2%)
        risk_free_rate = 0.02
        sharpe_ratio = safe_float((mean_return - risk_free_rate) / volatility if volatility > 0 else 0, 0.0)
        
        # Sortino Ratio
        downside_returns = returns[returns < 0]
        downside_volatility = safe_float(np.std(downside_returns) * np.sqrt(252) if len(downside_returns) > 0 else 0, 0.0)
        sortino_ratio = safe_float((mean_return - risk_free_rate) / downside_volatility if downside_volatility > 0 else 0, 0.0)
        
        # Skewness and Kurtosis
        skewness = safe_float(pd.Series(returns).skew(), 0.0)
        kurtosis = safe_float(pd.Series(returns).kurtosis(), 0.0)
        
        return RiskMetrics(
            portfolio_id=portfolio.id,
            value_at_risk=abs(var_95),
            conditional_var=abs(cvar_95),
            max_drawdown=abs(max_drawdown),
            sharpe_ratio=sharpe_ratio,
            sortino_ratio=sortino_ratio,
            volatility=volatility,
            skewness=skewness,
            kurtosis=kurtosis
        )
        
    except Exception as e:
        logging.error(f"Error calculating portfolio metrics: {str(e)}")
        return RiskMetrics(
            portfolio_id=portfolio.id,
            value_at_risk=0.0,
            conditional_var=0.0,
            max_drawdown=0.0,
            sharpe_ratio=0.0,
            sortino_ratio=0.0,
            volatility=0.0,
            skewness=0.0,
            kurtosis=0.0
        )

# API Routes
@api_router.get("/")
async def root():
    return {"message": "DeFi Risk Assessment & Portfolio Management System"}

@api_router.post("/portfolio/create")
async def create_portfolio(request: PortfolioRequest):
    """Create a new portfolio by analyzing a wallet address"""
    try:
        # Fetch wallet balance
        token_balances = await fetch_wallet_balance(request.wallet_address)
        
        # Get symbols for price data
        symbols = [token["symbol"] for token in token_balances if token["balance"] > 0]
        
        if not symbols:
            symbols = ["BTC"]  # Default to prevent empty symbol error
        
        # Fetch market data
        market_data = await fetch_coinmarketcap_data(symbols)
        
        # Calculate portfolio value
        portfolio_tokens = []
        total_value = 0.0
        
        for token in token_balances:
            symbol = token["symbol"]
            balance = token["balance"]
            
            # Get price data
            price_data = market_data.get("data", {}).get(symbol, {})
            quote = price_data.get("quote", {}).get("USD", {})
            
            price = quote.get("price", 0.0)
            change_24h = quote.get("percent_change_24h", 0.0)
            
            value_usd = balance * price
            total_value += value_usd
            
            portfolio_tokens.append(TokenBalance(
                symbol=symbol,
                name=price_data.get("name", symbol),
                balance=balance,
                value_usd=value_usd,
                price_usd=price,
                change_24h=change_24h,
                wallet_address=request.wallet_address
            ))
        
        # Calculate basic risk metrics
        if portfolio_tokens:
            risk_score = min(100, max(0, 50 + sum(abs(token.change_24h) for token in portfolio_tokens) / len(portfolio_tokens)))
        else:
            risk_score = 50.0  # Default risk score when no tokens
        
        # Create portfolio
        portfolio = Portfolio(
            user_id=request.user_id,
            wallet_address=request.wallet_address,
            total_value_usd=total_value,
            tokens=portfolio_tokens,
            risk_score=risk_score
        )
        
        # Save to database
        portfolio_dict = portfolio.dict()
        await db.portfolios.insert_one(portfolio_dict)
        
        return portfolio
        
    except Exception as e:
        logging.error(f"Error creating portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/portfolio/{portfolio_id}")
async def get_portfolio(portfolio_id: str):
    """Get portfolio details"""
    try:
        portfolio = await db.portfolios.find_one({"id": portfolio_id}, {"_id": 0})
        if not portfolio:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        return portfolio
    except Exception as e:
        logging.error(f"Error fetching portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/portfolio/{portfolio_id}/risk-analysis")
async def analyze_portfolio_risk(portfolio_id: str, request: RiskAssessmentRequest):
    """Perform comprehensive risk analysis on a portfolio"""
    try:
        # Get portfolio
        portfolio_data = await db.portfolios.find_one({"id": portfolio_id}, {"_id": 0})
        if not portfolio_data:
            raise HTTPException(status_code=404, detail="Portfolio not found")
        
        portfolio = Portfolio(**portfolio_data)
        
        # Generate historical data (simplified - in real implementation, you'd fetch actual historical data)
        historical_data = []
        base_value = portfolio.total_value_usd
        
        for i in range(request.time_period):
            # Simulate price movements
            daily_change = np.random.normal(0, 0.02)  # 2% daily volatility
            value = base_value * (1 + daily_change)
            historical_data.append({
                "date": datetime.now() - timedelta(days=i),
                "value": value
            })
            base_value = value
        
        # Calculate risk metrics
        risk_metrics = calculate_portfolio_metrics(portfolio, historical_data)
        
        # Save risk analysis
        await db.risk_metrics.insert_one(risk_metrics.dict())
        
        return risk_metrics
        
    except Exception as e:
        logging.error(f"Error analyzing portfolio risk: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/sentiment/analyze")
async def analyze_sentiment(request: SentimentAnalysisRequest):
    """Analyze market sentiment for given symbols"""
    try:
        results = []
        
        for symbol in request.symbols:
            sentiment_data = []
            
            # Fetch news sentiment
            if "news" in request.sources:
                news_sentiment = await fetch_news_sentiment(symbol)
                if news_sentiment:
                    sentiment_data.append(news_sentiment)
            
            # Fetch Reddit sentiment
            if "reddit" in request.sources:
                reddit_sentiment = await fetch_reddit_sentiment(symbol)
                if reddit_sentiment:
                    sentiment_data.append(reddit_sentiment)
            
            # Aggregate sentiment
            if sentiment_data:
                avg_sentiment = sum(s['sentiment_score'] for s in sentiment_data) / len(sentiment_data)
                avg_confidence = sum(s['confidence'] for s in sentiment_data) / len(sentiment_data)
                total_volume = sum(s['volume'] for s in sentiment_data)
                
                # Save sentiment data
                sentiment_obj = SentimentData(
                    symbol=symbol,
                    source="aggregated",
                    sentiment_score=avg_sentiment,
                    confidence=avg_confidence,
                    volume=total_volume,
                    text_sample=f"Aggregated from {len(sentiment_data)} sources"
                )
                
                await db.sentiment_data.insert_one(sentiment_obj.dict())
                results.append(sentiment_obj)
        
        return results
        
    except Exception as e:
        logging.error(f"Error analyzing sentiment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/market-data/{symbol}")
async def get_market_data(symbol: str):
    """Get comprehensive market data for a symbol"""
    try:
        # Fetch from CoinMarketCap
        market_data = await fetch_coinmarketcap_data([symbol])
        
        if not market_data:
            raise HTTPException(status_code=404, detail="Market data not found")
        
        data = market_data.get("data", {}).get(symbol, {})
        quote = data.get("quote", {}).get("USD", {})
        
        market_obj = MarketData(
            symbol=symbol,
            price=quote.get("price", 0.0),
            volume_24h=quote.get("volume_24h", 0.0),
            market_cap=quote.get("market_cap", 0.0),
            change_24h=quote.get("percent_change_24h", 0.0),
            volatility=abs(quote.get("percent_change_24h", 0.0))  # Simplified volatility
        )
        
        # Save market data
        await db.market_data.insert_one(market_obj.dict())
        
        return market_obj
        
    except Exception as e:
        logging.error(f"Error fetching market data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/yield-opportunities")
async def get_yield_opportunities():
    """Get current yield farming opportunities"""
    try:
        # Simplified yield opportunities (in real implementation, you'd fetch from DeFi protocols)
        opportunities = [
            YieldOpportunity(
                protocol="Uniswap V3",
                pool_address="0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
                token_pair="ETH/USDC",
                apy=12.5,
                tvl=150000000,
                risk_score=3.2,
                fees_24h=125000
            ),
            YieldOpportunity(
                protocol="Compound",
                pool_address="0x39aa39c021dfbae8fac545936693ac917d5e7563",
                token_pair="USDC",
                apy=8.3,
                tvl=800000000,
                risk_score=2.1,
                fees_24h=85000
            ),
            YieldOpportunity(
                protocol="Aave",
                pool_address="0x030ba81f1c18d280636f32af80b9aad02cf0854e",
                token_pair="WETH",
                apy=6.7,
                tvl=1200000000,
                risk_score=1.8,
                fees_24h=95000
            ),
            YieldOpportunity(
                protocol="Curve",
                pool_address="0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7",
                token_pair="3Pool",
                apy=15.2,
                tvl=300000000,
                risk_score=4.1,
                fees_24h=180000
            )
        ]
        
        # Save opportunities
        for opp in opportunities:
            await db.yield_opportunities.insert_one(opp.dict())
        
        return opportunities
        
    except Exception as e:
        logging.error(f"Error fetching yield opportunities: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/dashboard/{user_id}")
async def get_dashboard_data(user_id: str):
    """Get comprehensive dashboard data for a user"""
    try:
        # Get user's portfolios
        portfolios = await db.portfolios.find({"user_id": user_id}, {"_id": 0}).to_list(100)
        
        # Get recent risk metrics
        risk_metrics = await db.risk_metrics.find({}, {"_id": 0}).sort("timestamp", -1).limit(10).to_list(10)
        
        # Get recent sentiment data
        sentiment_data = await db.sentiment_data.find({}, {"_id": 0}).sort("timestamp", -1).limit(20).to_list(20)
        
        # Get yield opportunities
        yield_opportunities = await db.yield_opportunities.find({}, {"_id": 0}).sort("timestamp", -1).limit(10).to_list(10)
        
        # Get recent alerts
        alerts = await db.alerts.find({"user_id": user_id}, {"_id": 0}).sort("triggered_at", -1).limit(10).to_list(10)
        
        # Calculate safe summary metrics
        total_portfolio_value = 0.0
        total_risk_score = 0.0
        
        for portfolio in portfolios:
            total_portfolio_value += safe_float(portfolio.get("total_value_usd", 0))
            total_risk_score += safe_float(portfolio.get("risk_score", 0))
        
        avg_risk_score = safe_float(total_risk_score / len(portfolios) if portfolios else 0)
        
        # Clean all data for JSON serialization
        dashboard_data = {
            "portfolios": clean_data_for_json(portfolios),
            "risk_metrics": clean_data_for_json(risk_metrics),
            "sentiment_data": clean_data_for_json(sentiment_data),
            "yield_opportunities": clean_data_for_json(yield_opportunities),
            "alerts": clean_data_for_json(alerts),
            "summary": {
                "total_portfolio_value": total_portfolio_value,
                "portfolio_count": len(portfolios),
                "avg_risk_score": avg_risk_score,
                "total_alerts": len(alerts)
            }
        }
        
        return dashboard_data
        
    except Exception as e:
        logging.error(f"Error fetching dashboard data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/alerts/{user_id}")
async def get_user_alerts(user_id: str):
    """Get alerts for a user"""
    try:
        alerts = await db.alerts.find({"user_id": user_id}, {"_id": 0}).sort("triggered_at", -1).to_list(100)
        return alerts
    except Exception as e:
        logging.error(f"Error fetching alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Background tasks
async def monitor_portfolios():
    """Background task to monitor portfolios and generate alerts"""
    while True:
        try:
            # Get all portfolios
            portfolios = await db.portfolios.find({}, {"_id": 0}).to_list(1000)
            
            for portfolio_data in portfolios:
                try:
                    portfolio = Portfolio(**portfolio_data)
                    
                    # Check for risk threshold breaches
                    if portfolio.risk_score > 80:
                        alert = AlertModel(
                            user_id=portfolio.user_id,
                            alert_type="HIGH_RISK",
                            message=f"Portfolio risk score is {portfolio.risk_score:.1f}. Consider rebalancing.",
                            severity="high"
                        )
                        await db.alerts.insert_one(alert.dict())
                    
                    # Check for significant value changes
                    # (This would require comparing with previous values)
                    
                except Exception as e:
                    logging.error(f"Error processing portfolio {portfolio_data.get('id', 'unknown')}: {str(e)}")
                    continue
                
            await asyncio.sleep(300)  # Check every 5 minutes
            
        except Exception as e:
            logging.error(f"Error in portfolio monitoring: {str(e)}")
            await asyncio.sleep(60)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://defi-final-ng3spn17a-arshad-jafris-projects.vercel.app"],  # Allow both local and deployed frontend
    allow_credentials=True,  # required if you're using cookies/auth
    allow_methods=["*"],
    allow_headers=["*"],
)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Initialize background tasks"""
    logger.info("Starting DeFi Risk Assessment & Portfolio Management System")
    # Start background monitoring
    asyncio.create_task(monitor_portfolios())

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()