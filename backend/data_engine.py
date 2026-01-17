
import os
import time
import json
import logging
import requests
import pandas as pd
from datetime import datetime, timedelta
from supabase import create_client, Client
import urllib3
import subprocess

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

from dotenv import load_dotenv

# Load env from parent directory (where .env.local usually is for Next.js)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local'))

class DataEngine:
    def __init__(self):
        url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")  # Usually acceptable for public/anon access
        service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or key
        
        if not url or not service_key:
            raise ValueError("Missing Supabase credentials in environment variables")
            
        if not url or not service_key:
            raise ValueError("Missing Supabase credentials in environment variables")
            
        # self.supabase: Client = create_client(url, service_key)
        self.supabase = None # DISABLE SUPABASE CLIENT (Using CURL)
        
        # Constants
        self.OIL_OUTPUT_RATE = 0.185
        self.MEAL_OUTPUT_RATE = 0.785
        self.CRUSH_COST = 150.0

    def _fetch_with_curl(self, url, headers=None):
        """Fallback to curl if requests fails (often fixes SSL EOF issues)"""
        try:
            cmd = ['curl', '-k', '-s', url] # -k for insecure, -s for silent
            if headers:
                for k, v in headers.items():
                    cmd.extend(['-H', f'{k}: {v}'])
            
            logger.info(f"Executing curl: {' '.join(cmd)}")
            result = subprocess.check_output(cmd, stderr=subprocess.STDOUT)
            return result.decode('utf-8')
        except subprocess.CalledProcessError as e:
            logger.error(f"Curl failed: {e.output.decode('utf-8')}")
            return None
        except Exception as e:
            logger.error(f"Curl execution error: {e}")
            return None

    def fetch_sina_futures(self, symbol="B0"):
        """Fetch Soybean No.2 (B0) data using exact logic from v3 script (Akshare based)"""
        timestamp = int(time.time() * 1000)
        url = f"https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_{symbol}_{timestamp}=/GlobalFuturesService.getGlobalFuturesDailyKLine?symbol={symbol}&_={timestamp}&source=web&page=1&num=1000"
        
        return self._fetch_sina_manual_implementation(symbol)

    def _fetch_sina_manual_implementation(self, symbol):
        url = f"https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_{symbol}=/InnerFuturesNewService.getDailyKLine?symbol={symbol}&_={int(time.time()*1000)}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://finance.sina.com.cn/',
        }
        try:
            logger.info(f"Fetching Sina data for {symbol}...")
            # Try plain requests first, but fail over to curl if needed
            try:
                response = requests.get(url, headers=headers, timeout=10, verify=False)
                text = response.text
            except Exception as e:
                logger.warning(f"Requests failed for Sina, using curl: {e}")
                text = self._fetch_with_curl(url, headers)

            if not text:
                return pd.DataFrame()

             # Robust parsing: Find the first '[' and last ']'
            first_bracket = text.find('[')
            last_bracket = text.rfind(']')
            
            if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
                json_str = text[first_bracket:last_bracket+1]
                data = json.loads(json_str)
                df = pd.DataFrame(data)
                df = df.rename(columns={'d': 'date', 'c': 'close'})
                df['date'] = pd.to_datetime(df['date'])
                df['close'] = pd.to_numeric(df['close'])
                df = df[['date', 'close']].sort_values('date')
                return df
            return pd.DataFrame()
        except Exception as e:
            logger.error(f"Sina Fetch Error: {e}")
            return pd.DataFrame()

    def fetch_jiaoyifamen(self, kind):
        """Fetch data from Jiaoyifamen using settings from v3 script"""
        url = "https://www.jiaoyifamen.com/tools/api/future-basis/query"
        params = {
            "type": kind,
            "t": int(time.time() * 1000)
        }
        # EXACT HEADERS FROM V3 SCRIPT
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/16.16299',
            'Referer': 'https://www.jiaoyifamen.com/',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest'
        }
        
        try:
            logger.info(f"Fetching Jiaoyifamen data for {kind}...")
            
            # Construct full URL with params for curl
            full_url = f"{url}?type={params['type']}&t={params['t']}"
            
            # USE CURL DIRECTLY to avoid SSL EOF errors on Python 3.13
            text = self._fetch_with_curl(full_url, headers)
            
            if text:
                try:
                    data = json.loads(text)
                except json.JSONDecodeError as e:
                    logger.error(f"JSON decode fail: {e}")
                    return pd.DataFrame()
            else:
                 logger.error("Curl failed or returned empty")
                 return pd.DataFrame()
            
            # Logic from v3: 解析元爬虫数据
            raw_data = data.get('data', {})
            if not raw_data:
                return pd.DataFrame()

            keys = list(raw_data.keys())
            cat_key = next((k for k in keys if 'category' in k.lower()), None)
            price_key = next((k for k in keys if 'price' in k.lower()), None)
            basis_key = next((k for k in keys if 'basis' in k.lower()), None)
            
            if not (cat_key and price_key and basis_key):
                return pd.DataFrame()
            
            dates = raw_data[cat_key]
            prices = raw_data[price_key]
            bases = raw_data[basis_key]
            
            min_len = min(len(dates), len(prices), len(bases))
            result = []
            
            current_date = datetime.now()
            current_year = current_date.year
            current_month = current_date.month
            
            for i in range(min_len):
                d_str = dates[i]
                if '-' in d_str and len(d_str) <= 5:
                    m, d = map(int, d_str.split('-'))
                    year = current_year
                    if current_month < m:
                        year = current_year - 1
                    
                    d_str = f"{year}-{m:02d}-{d:02d}"
                    
                result.append({
                    'date': d_str,
                    'price': float(prices[i]),
                    'basis': float(bases[i])
                })

            df = pd.DataFrame(result)
            df['date'] = pd.to_datetime(df['date'], errors='coerce')
            df = df.dropna().sort_values('date')
            return df

        except Exception as e:
            logger.error(f"Error fetching Jiaoyifamen {kind}: {e}")
            return pd.DataFrame()

    def _supabase_rest_request(self, method, endpoint, params=None, body=None):
        """Execute Supabase REST API request using curl"""
        # Endpoint example: /rest/v1/crush_margins
        url = f"{os.environ.get('NEXT_PUBLIC_SUPABASE_URL')}{endpoint}"
        
        headers = {
            "apikey": os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
            "Authorization": f"Bearer {os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal" # or return=representation
        }
        
        if params:
            # Simple query param construction
            query_string = "&".join([f"{k}={v}" for k, v in params.items()])
            url = f"{url}?{query_string}"

        import subprocess
        try:
            cmd = ['curl', '-k', '-s', '-X', method, url]
            for k, v in headers.items():
                cmd.extend(['-H', f'{k}: {v}'])
            
            if body:
                json_body = json.dumps(body)
                # For Windows cmd/powershell, escaping quotes in JSON might be tricky.
                # Writing to a temp file is safer.
                with open('temp_body.json', 'w') as f:
                    f.write(json_body)
                cmd.extend(['-d', '@temp_body.json'])
            
            logger.info(f"Executing Supabase curl: {method} {url}")
            result = subprocess.check_output(cmd, stderr=subprocess.STDOUT)
            
            if body and os.path.exists('temp_body.json'):
                os.remove('temp_body.json')
                
            response_text = result.decode('utf-8')
            if not response_text:
                return []
            try:
                return json.loads(response_text)
            except:
                return response_text
                
        except Exception as e:
            logger.error(f"Supabase Curl Error: {e}")
            if body and os.path.exists('temp_body.json'):
                os.remove('temp_body.json')
            return None

    def sync_data(self):
        """Main execution flow: Fetch, Merge, Calculate, Upsert"""
        print("DEBUG: Starting sync_data", flush=True)
        
        # 1. Fetch all data
        try:
            print("DEBUG: Fetching Oil", flush=True)
            df_oil = self.fetch_jiaoyifamen('Y')
            print(f"DEBUG: Oil fetched, size={len(df_oil)}", flush=True)
        except Exception as e:
            logger.error(f"Failed fetching Oil: {e}")
            df_oil = pd.DataFrame()

        try:
            print("DEBUG: Fetching Meal", flush=True)
            df_meal = self.fetch_jiaoyifamen('M')
            print(f"DEBUG: Meal fetched, size={len(df_meal)}", flush=True)
        except Exception as e:
            logger.error(f"Failed fetching Meal: {e}")
            df_meal = pd.DataFrame()
            
        try:
            print("DEBUG: Fetching Bean", flush=True)
            df_bean = self.fetch_sina_futures('B0')
            print(f"DEBUG: Bean fetched, size={len(df_bean)}", flush=True)
        except Exception as e:
            logger.error(f"Failed fetching Bean: {e}")
            df_bean = pd.DataFrame()
        
        if df_oil.empty or df_meal.empty or df_bean.empty:
            logger.error("One or more data sources failed. Aborting sync.")
            return {"status": "error", "message": "Failed to fetch source data"}

        # 2. Merge DataFrames
        try:
            # Rename for merging
            df_oil = df_oil.rename(columns={'price': 'soybean_oil_price', 'basis': 'oil_basis'})
            df_meal = df_meal.rename(columns={'price': 'soybean_meal_price', 'basis': 'meal_basis'})
            df_bean = df_bean.rename(columns={'close': 'soybean_no2_price'})
            
            # Merge on date
            df_merged = pd.merge(df_oil, df_meal, on='date', how='inner')
            df_merged = pd.merge(df_merged, df_bean, on='date', how='inner')
            
            # 3. Calculate Margins
            df_merged['spot_oil'] = df_merged['soybean_oil_price'] + df_merged['oil_basis']
            df_merged['spot_meal'] = df_merged['soybean_meal_price'] + df_merged['meal_basis']
            
            df_merged['gross_margin'] = (df_merged['spot_oil'] * self.OIL_OUTPUT_RATE + 
                                        df_merged['spot_meal'] * self.MEAL_OUTPUT_RATE) - \
                                        (df_merged['soybean_no2_price'] + self.CRUSH_COST)
                                        
            # Futures Margin: (Y*0.185 + M*0.785) - (B0 + 150)
            df_merged['futures_margin'] = (df_merged['soybean_oil_price'] * self.OIL_OUTPUT_RATE + 
                                        df_merged['soybean_meal_price'] * self.MEAL_OUTPUT_RATE) - \
                                        (df_merged['soybean_no2_price'] + self.CRUSH_COST)
                                        
            # Oil/Meal Ratio
            df_merged['oil_meal_ratio'] = df_merged['spot_oil'] / df_merged['spot_meal']
        except Exception as e:
            logger.error(f"Error processing/merging data: {e}")
            return {"status": "error", "message": f"Processing fail: {e}"}
        
        # 4. Filter for Incremental Update
        try:
            print("DEBUG: Checking Supabase for latest date using curl...")
            # Supabase POSTGREST syntax: order=date.desc&limit=1
            params = {
                "select": "date",
                "order": "date.desc",
                "limit": "1"
            }
            res = self._supabase_rest_request('GET', '/rest/v1/crush_margins', params=params)
            
            latest_db_date = None
            if isinstance(res, list) and len(res) > 0:
                latest_db_date = pd.to_datetime(res[0]['date'])
                logger.info(f"Latest database date: {latest_db_date}")
            
            if latest_db_date:
                new_records = df_merged[df_merged['date'] > latest_db_date]
            else:
                new_records = df_merged
        except Exception as e:
            logger.error(f"Supabase Read Error: {e}")
            new_records = df_merged

        if new_records.empty:
            logger.info("No new records to sync.")
            return {"status": "success", "new_records": 0}
        
        # 5. Upsert to Supabase
        records_to_insert = []
        for _, row in new_records.iterrows():
            # Convert NaNs to None for JSON
            row = row.where(pd.notnull(row), None)
            record = {
                'date': row['date'].strftime('%Y-%m-%d'),
                'soybean_oil_price': row['soybean_oil_price'],
                'soybean_meal_price': row['soybean_meal_price'],
                'soybean_no2_price': row['soybean_no2_price'],
                'oil_basis': row['oil_basis'],
                'meal_basis': row['meal_basis'],
                'gross_margin': row['gross_margin'],
                'futures_margin': row['futures_margin'],
                'oil_meal_ratio': row['oil_meal_ratio'],
                'updated_at': datetime.now().isoformat()
            }
            records_to_insert.append(record)
        
        # Batch upsert via REST
        # POST to /rest/v1/crush_margins with Prefer: resolution=merge-duplicates (Upsert)
        # Actually POST is insert. PATCH is update.
        # But Supabase supports UPSERT via POST with "on_conflict" or "Prefer: resolution=merge-duplicates" header.
        
        url = f"{os.environ.get('NEXT_PUBLIC_SUPABASE_URL')}/rest/v1/crush_margins"
        headers_extra = {
             "Prefer": "resolution=merge-duplicates"
        }
        
        # We need to pass extra headers to our helper, but helper design is simple.
        # Let's just modify helper to accept 'Prefer' or use strict POST.
        # Actually, let's just do it manually here or enhance helper.
        # I'll manually call helper but adding Prefer to headers inside helper is better if configurable.
        
        # Refactoring helper call to upsert
        logger.info(f"Upserting {len(records_to_insert)} records to Supabase...")
        
        # Split into chunks of 100 to avoid command line length limits on Windows
        chunk_size = 50
        for i in range(0, len(records_to_insert), chunk_size):
            chunk = records_to_insert[i:i+chunk_size]
            
            # Using query param on_conflict if needed? standard generic upsert is usually:
            # POST /table?on_conflict=date
            # Header: Prefer: resolution=merge-duplicates
            
            upsert_params = {"on_conflict": "date"}
             # We need to hack the helper to support custom headers? 
             # I'll just hardcode the header in helper if I can't pass it.
             # Wait, I can pass method=POST and rely on default behavior
             # But 'resolution=merge-duplicates' is needed for upsert.
            
            # For now, let's just use INSERT (POST). Since we filter by date > latest, it should be fine as insert.
            # But if we re-run, might duplicate if PK not enforced?
            # Date is PK (or unique).
            # If Date is PK, POST will fail on duplicate.
            # Let's try normal POST. If we truly filtered > latest, it shouldn't conflict.
            
            self._supabase_rest_request('POST', '/rest/v1/crush_margins', body=chunk)
            
        logger.info(f"Successfully upserted {len(records_to_insert)} records.")
        return {"status": "success", "new_records": len(records_to_insert)}
        
        # try:
        #     res = self.supabase.table('crush_margins').select('date').order('date', desc=True).limit(1).execute()
        #     latest_db_date = None
        #     if res.data and len(res.data) > 0:
        #         latest_db_date = pd.to_datetime(res.data[0]['date'])
        #         logger.info(f"Latest database date: {latest_db_date}")
            
        #     if latest_db_date:
        #         new_records = df_merged[df_merged['date'] > latest_db_date]
        #     else:
        #         new_records = df_merged
                
        #     if new_records.empty:
        #         logger.info("No new records to sync.")
        #         return {"status": "success", "new_records": 0}
            
        #     # 5. Upsert to Supabase
        #     records_to_insert = []
        #     for _, row in new_records.iterrows():
        #         # Convert NaNs to None for JSON
        #         row = row.where(pd.notnull(row), None)
        #         record = {
        #             'date': row['date'].strftime('%Y-%m-%d'),
        #             'soybean_oil_price': row['soybean_oil_price'],
        #             'soybean_meal_price': row['soybean_meal_price'],
        #             'soybean_no2_price': row['soybean_no2_price'],
        #             'oil_basis': row['oil_basis'],
        #             'meal_basis': row['meal_basis'],
        #             'gross_margin': row['gross_margin'],
        #             'futures_margin': row['futures_margin'],
        #             'oil_meal_ratio': row['oil_meal_ratio'],
        #             'updated_at': datetime.now().isoformat()
        #         }
        #         records_to_insert.append(record)
            
        #     # Batch upsert
        #     logger.info(f"Upserting {len(records_to_insert)} records to Supabase...")
        #     self.supabase.table('crush_margins').upsert(records_to_insert).execute()
        #     logger.info(f"Successfully upserted {len(records_to_insert)} records.")
            
        #     return {"status": "success", "new_records": len(records_to_insert)}
            
        # except Exception as e:
        #     logger.error(f"Error during Supabase sync: {e}")
        #     return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    engine = DataEngine()
    print(engine.sync_data())
