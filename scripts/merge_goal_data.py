#!/usr/bin/env python3
"""
Merge Hockey Reference + MoneyPuck data for Ovechkin goals.

Hockey Reference provides: assists, goal types, dates
MoneyPuck provides: x,y coordinates, goalie names, shot types

Usage:
    python scripts/merge_goal_data.py

Inputs:
    - data/hockey_reference_goals.json (from scraper)
    - data/shots_all.csv (download from MoneyPuck/Kaggle)

Output:
    - data/ovechkin_goals_complete.json
"""

import json
import csv
import os
from datetime import datetime
from collections import defaultdict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')

HR_FILE = os.path.join(DATA_DIR, 'hockey_reference_goals.json')
MP_FILE = os.path.join(DATA_DIR, 'shots_all.csv')
OUTPUT_FILE = os.path.join(DATA_DIR, 'ovechkin_goals_complete.json')

# Ovechkin's player ID in NHL system
OVI_PLAYER_ID = 8471214


def load_hockey_reference():
    """Load Hockey Reference scraped data."""
    if not os.path.exists(HR_FILE):
        print(f"Warning: {HR_FILE} not found. Run the scraper first.")
        return None

    with open(HR_FILE, 'r') as f:
        return json.load(f)


def load_moneypuck_goals():
    """Load and filter MoneyPuck shots CSV for Ovechkin goals."""
    if not os.path.exists(MP_FILE):
        print(f"Warning: {MP_FILE} not found.")
        print("Download from: https://www.kaggle.com/datasets/mexwell/nhl-database")
        print("Or: https://moneypuck.com/data.htm")
        return {}

    goals = {}

    with open(MP_FILE, 'r') as f:
        reader = csv.DictReader(f)

        for row in reader:
            # Filter for Ovechkin goals only
            shooter_id = row.get('shooterPlayerId') or row.get('shooter_id')
            event = row.get('event') or row.get('Event')

            if str(shooter_id) != str(OVI_PLAYER_ID):
                continue
            if event and event.upper() != 'GOAL':
                continue

            # Parse date - MoneyPuck uses various formats
            game_date = row.get('gameDate') or row.get('game_date') or row.get('date')
            if game_date:
                # Normalize date format
                try:
                    if len(game_date) == 8:  # 20051005 format
                        game_date = f"{game_date[:4]}-{game_date[4:6]}-{game_date[6:8]}"
                    elif '/' in game_date:
                        parts = game_date.split('/')
                        game_date = f"{parts[2]}-{parts[0]:0>2}-{parts[1]:0>2}"
                except:
                    pass

            period = row.get('period') or row.get('Period')
            time_str = row.get('time') or row.get('Time') or row.get('periodTime')

            # Create lookup key: date + period + time
            key = f"{game_date}_{period}_{time_str}"

            # Extract coordinates
            x_coord = row.get('xCord') or row.get('xCoord') or row.get('x')
            y_coord = row.get('yCord') or row.get('yCoord') or row.get('y')

            try:
                x_coord = float(x_coord) if x_coord else None
                y_coord = float(y_coord) if y_coord else None
            except (ValueError, TypeError):
                x_coord = None
                y_coord = None

            goals[key] = {
                'xCoord': x_coord,
                'yCoord': y_coord,
                'goalieName': row.get('goalieNameForShot') or row.get('goalie_name') or row.get('goalieName'),
                'shotType': row.get('shotType') or row.get('shot_type'),
                'gameId': row.get('game_id') or row.get('gameId'),
                'homeTeam': row.get('homeTeamCode') or row.get('home_team'),
                'awayTeam': row.get('awayTeamCode') or row.get('away_team'),
            }

    print(f"Loaded {len(goals)} Ovechkin goals from MoneyPuck")
    return goals


def merge_data(hr_data, mp_goals):
    """Merge Hockey Reference and MoneyPuck data."""
    if not hr_data:
        print("No Hockey Reference data to merge")
        return None

    merged_goals = []
    matched = 0
    unmatched = 0

    for goal in hr_data.get('goals', []):
        # Normalize HR date format
        hr_date = goal.get('date', '')
        if hr_date:
            # HR uses "2005-10-05" format typically
            pass

        period = goal.get('period', '')
        time = goal.get('time', '')

        # Try to find matching MoneyPuck data
        key = f"{hr_date}_{period}_{time}"
        mp_data = mp_goals.get(key)

        if not mp_data:
            # Try without leading zeros in time
            time_parts = time.split(':')
            if len(time_parts) == 2:
                alt_time = f"{int(time_parts[0])}:{time_parts[1]}"
                alt_key = f"{hr_date}_{period}_{alt_time}"
                mp_data = mp_goals.get(alt_key)

        merged_goal = {
            'careerGoalNum': goal.get('careerGoalNum'),
            'date': hr_date,
            'season': goal.get('season'),
            'seasonDisplay': goal.get('seasonDisplay'),
            'opponent': goal.get('opponent'),
            'period': period,
            'time': time,
            'goalType': goal.get('goalType'),
            'primaryAssist': goal.get('primaryAssist'),
            'secondaryAssist': goal.get('secondaryAssist'),
            'isPlayoffs': goal.get('isPlayoffs', False),
        }

        if mp_data:
            merged_goal['xCoord'] = mp_data.get('xCoord')
            merged_goal['yCoord'] = mp_data.get('yCoord')
            merged_goal['goalieName'] = mp_data.get('goalieName')
            merged_goal['shotType'] = mp_data.get('shotType')
            matched += 1
        else:
            merged_goal['xCoord'] = None
            merged_goal['yCoord'] = None
            merged_goal['goalieName'] = None
            merged_goal['shotType'] = None
            unmatched += 1

        merged_goals.append(merged_goal)

    print(f"\nMerge results:")
    print(f"  Matched: {matched} goals")
    print(f"  Unmatched: {unmatched} goals (missing coordinates)")

    # Rebuild stats with complete data
    stats = rebuild_stats(merged_goals)

    return {
        'metadata': {
            'player': 'Alex Ovechkin',
            'playerId': OVI_PLAYER_ID,
            'mergedAt': datetime.now().isoformat(),
            'sources': ['Hockey Reference', 'MoneyPuck'],
            'regularSeasonGoals': len([g for g in merged_goals if not g.get('isPlayoffs')]),
            'playoffGoals': len([g for g in merged_goals if g.get('isPlayoffs')]),
            'goalsWithCoordinates': matched,
        },
        'stats': stats,
        'goals': merged_goals
    }


def rebuild_stats(goals):
    """Build summary statistics from merged goals."""
    regular_goals = [g for g in goals if not g.get('isPlayoffs')]

    stats = {
        'bySeason': defaultdict(int),
        'byOpponent': defaultdict(int),
        'byGoalType': defaultdict(int),
        'byGoalie': defaultdict(int),
        'byAnyAssist': defaultdict(int),
        'byShotType': defaultdict(int),
    }

    for goal in regular_goals:
        if goal.get('season'):
            stats['bySeason'][goal['season']] += 1
        if goal.get('opponent'):
            stats['byOpponent'][goal['opponent']] += 1
        if goal.get('goalType'):
            stats['byGoalType'][goal['goalType']] += 1
        if goal.get('goalieName'):
            stats['byGoalie'][goal['goalieName']] += 1
        if goal.get('shotType'):
            stats['byShotType'][goal['shotType']] += 1
        if goal.get('primaryAssist'):
            stats['byAnyAssist'][goal['primaryAssist']] += 1
        if goal.get('secondaryAssist'):
            stats['byAnyAssist'][goal['secondaryAssist']] += 1

    # Convert defaultdicts to regular dicts and add sorted lists
    result = {k: dict(v) for k, v in stats.items()}

    # Add top lists
    result['topAssisters'] = sorted(
        stats['byAnyAssist'].items(),
        key=lambda x: x[1],
        reverse=True
    )[:20]

    result['topGoalies'] = sorted(
        stats['byGoalie'].items(),
        key=lambda x: x[1],
        reverse=True
    )[:20]

    result['topOpponents'] = sorted(
        stats['byOpponent'].items(),
        key=lambda x: x[1],
        reverse=True
    )[:10]

    return result


def main():
    print("=== Ovechkin Goals Data Merge ===\n")

    # Load data
    hr_data = load_hockey_reference()
    mp_goals = load_moneypuck_goals()

    if not hr_data:
        print("\nCannot proceed without Hockey Reference data.")
        print("Run: npm run collect:hr")
        return

    # Merge
    merged = merge_data(hr_data, mp_goals)

    if merged:
        # Save output
        with open(OUTPUT_FILE, 'w') as f:
            json.dump(merged, f, indent=2)

        print(f"\n=== Merge Complete ===")
        print(f"Output saved to: {OUTPUT_FILE}")
        print(f"\nTop 5 Assisters:")
        for name, count in merged['stats']['topAssisters'][:5]:
            print(f"  {name}: {count}")

        if merged['stats'].get('topGoalies'):
            print(f"\nTop 5 Goalies Scored Against:")
            for name, count in merged['stats']['topGoalies'][:5]:
                print(f"  {name}: {count}")


if __name__ == '__main__':
    main()
