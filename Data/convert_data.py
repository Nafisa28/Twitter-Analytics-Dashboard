import pandas as pd
import json
import os

def convert():
    input_file = os.path.join('Data', 'Tweet.xlsx')
    output_file = os.path.join('Data', 'tweets.json')
    
    print(f"Reading {input_file}...")
    df = pd.read_excel(input_file, sheet_name='SocialMedia (1)')
    
    # Clean rows: keep only rows where time is a string containing '+0000'
    original_len = len(df)
    df = df[df['time'].apply(lambda x: isinstance(x, str) and '+0000' in x)].copy()
    cleaned_len = len(df)
    print(f"Dropped {original_len - cleaned_len} rows with malformed/missing dates. Remaining: {cleaned_len} rows.")
    
    # Fill NaN values
    df['Tweet'] = df['Tweet'].fillna('').astype(str)
    df['id'] = df['id'].astype(str)
    
    # Numeric columns
    int_cols = [
        'impressions', 'engagements', 'retweets', 'replies', 'likes', 
        'user profile clicks', 'url clicks', 'hashtag clicks', 'detail expands', 
        'permalink clicks', 'app opens', 'app installs', 'follows', 
        'email tweet', 'dial phone', 'media views', 'media engagements'
    ]
    for col in int_cols:
        df[col] = df[col].fillna(0).round().astype(int)
        
    df['engagement rate'] = df['engagement rate'].fillna(0.0).astype(float)
    
    # Time processing
    # time format: YYYY-MM-DD HH:mm +0000
    df['time_dt'] = pd.to_datetime(df['time'], format='%Y-%m-%d %H:%M %z')
    
    # Derived fields
    df['tweetDate'] = df['time_dt'].dt.day.astype(int)
    df['dayOfWeek'] = df['time_dt'].dt.strftime('%a') # Mon, Tue, Wed, Thu, Fri, Sat, Sun
    df['month'] = df['time_dt'].dt.strftime('%b') # Jun, Jul, Aug
    df['hourUTC'] = df['time_dt'].dt.hour.astype(int)
    
    # hourIST: UTC + 5:30
    ist_dt = df['time_dt'] + pd.Timedelta(hours=5, minutes=30)
    df['hourIST'] = ist_dt.dt.hour.astype(int)
    
    df['wordCount'] = df['Tweet'].apply(lambda x: len(x.split())).astype(int)
    df['charCount'] = df['Tweet'].apply(lambda x: len(x)).astype(int)
    
    df['hasMedia'] = (df['media views'] > 0) | (df['media engagements'] > 0)
    df['hasLink'] = df['url clicks'] > 0
    df['hasHashtag'] = df['hashtag clicks'] > 0
    
    # tweetCategory: "Media" if hasMedia, else "Link" if hasLink, else "Hashtag" if hasHashtag, else "Other"
    def get_category(row):
        if row['hasMedia']:
            return 'Media'
        elif row['hasLink']:
            return 'Link'
        elif row['hasHashtag']:
            return 'Hashtag'
        else:
            return 'Other'
            
    df['tweetCategory'] = df.apply(get_category, axis=1)
    
    # We also keep a list of categories since tweets can match multiple categories for Task 1
    def get_categories(row):
        cats = []
        if row['hasMedia']:
            cats.append('Media')
        if row['hasLink']:
            cats.append('Link')
        if row['hasHashtag']:
            cats.append('Hashtag')
        if not cats:
            cats.append('Other')
        return cats
        
    df['tweetCategories'] = df.apply(get_categories, axis=1)
    
    # Convert dataframe to list of dicts
    records = df.drop(columns=['time_dt']).to_dict(orient='records')
    
    # Format boolean fields as bool instead of numpy bool
    for r in records:
        r['hasMedia'] = bool(r['hasMedia'])
        r['hasLink'] = bool(r['hasLink'])
        r['hasHashtag'] = bool(r['hasHashtag'])
        
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully converted {len(records)} tweets and saved to {output_file}")
    
    # Also copy to public/ so Vite serves it as a static asset (not bundled into JS)
    import shutil
    public_dir = os.path.join('public')
    os.makedirs(public_dir, exist_ok=True)
    public_output = os.path.join(public_dir, 'tweets.json')
    shutil.copy(output_file, public_output)
    print(f"Copied tweets.json to {public_output} (served as static asset by Vite)")

if __name__ == '__main__':
    convert()
