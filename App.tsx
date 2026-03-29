import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { DiceCanvas } from './components/DiceCanvas';

const WINDS = ['東', '南', '西', '北'];
const ROUND_NUMS = ['一', '二', '三', '四'];
const PANEL = 88;
const LAMP_STRIP = 44;

function RonTsumoButtons() {
  return (
    <View style={styles.ronTsumoContainer}>
      <Pressable style={styles.ronBtn}>
        <Text style={styles.ronTsumoText}>ロン</Text>
      </Pressable>
      <Pressable style={styles.tsumoBtn}>
        <Text style={styles.ronTsumoText}>ツモ</Text>
      </Pressable>
    </View>
  );
}

function PlayerContent({ wind, score, hideWind = false }: { wind: string; score: number; hideWind?: boolean }) {
  return (
    <View style={styles.playerContent}>
      {!hideWind && (
        <View style={styles.windBadge}>
          <Text style={styles.windText}>{wind}</Text>
        </View>
      )}
      <Text style={styles.scoreText}>{score.toLocaleString()}</Text>
    </View>
  );
}

function Lamp({ on, pressable = false, longPressable = false, vertical = false, onPress, onLongPress }: { on: boolean; pressable?: boolean; longPressable?: boolean; vertical?: boolean; onPress?: () => void; onLongPress?: () => void }) {
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={400} disabled={!pressable && !longPressable}>
      <View style={[styles.lampOuter, vertical && styles.lampOuterV, on && styles.lampOuterOn]}>
        <View style={[styles.lampInner, on && styles.lampInnerOn]} />
      </View>
    </Pressable>
  );
}

export default function App() {
  const [scores, setScores] = useState([25000, 25000, 25000, 25000]);
  const [dealer, setDealer] = useState(0); // 0=bottom, 1=right, 2=top, 3=left
  const [roundWind, setRoundWind] = useState(0); // 0=東, 1=南, 2=西, 3=北
  const [roundNum, setRoundNum] = useState(1);   // 1-4
  const [dice, setDice] = useState([3, 4]);
  const [rolling, setRolling] = useState(false);
  const [honba, setHonba] = useState(0);
  const [rouletting, setRouletting] = useState(false);
  const [roulettePos, setRoulettePos] = useState(0);

  // positions: 0=bottom, 1=right, 2=top, 3=left (clockwise)
  // dealer = 東, next clockwise = 南, then 西, then 北
  const wind = (pos: number) => WINDS[(pos - dealer + 4) % 4];

  // 下家 = 東家の右隣（次の親）
  const shimocha = (dealer + 1) % 4;

  const advanceDealer = useCallback(() => {
    setDealer(d => (d + 1) % 4);
    setRoundNum(n => {
      if (n < 4) return n + 1;
      setRoundWind(w => (w + 1) % 4);
      return 1;
    });
  }, []);

  const reset = useCallback(() => {
    if (rouletting) return;
    const target = Math.floor(Math.random() * 4);

    // Build position sequence: ~24 steps at constant speed, ending at target
    const STEP_MS = 100;
    const positions: number[] = [];
    let pos = 0;
    while (positions.length < 24 || pos !== target) {
      pos = (pos + 1) % 4;
      positions.push(pos);
    }

    setRouletting(true);
    setRoulettePos(0);
    setRoundWind(0);
    setRoundNum(1);
    setScores([25000, 25000, 25000, 25000]);
    setHonba(0);

    positions.forEach((p, i) => {
      setTimeout(() => {
        setRoulettePos(p);
        if (i === positions.length - 1) {
          setDealer(target);
          setRouletting(false);
        }
      }, (i + 1) * STEP_MS);
    });
  }, [rouletting]);

  const roll = useCallback(() => {
    if (rolling) return;
    setRolling(true);
    setTimeout(() => {
      setDice([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]);
      setRolling(false);
    }, 900);
  }, [rolling]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.container}>

        {/* ── TOP PLAYER ── */}
        <View style={[styles.hPanel, { marginLeft: 110 }]}>
          <View style={{ transform: [{ rotate: '180deg' }], flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <PlayerContent wind={wind(2)} score={scores[2]} hideWind={rouletting} />
            <RonTsumoButtons />
          </View>
        </View>

        {/* lamp: between top panel and center */}
        <View style={[styles.hLampStrip, { justifyContent: 'flex-end' }]}>
          <Lamp on={rouletting ? roulettePos === 2 : dealer === 2} pressable={!rouletting && shimocha === 2} longPressable={!rouletting && dealer === 2} onPress={advanceDealer} onLongPress={roll} />
        </View>

        {/* ── MIDDLE ROW ── */}
        <View style={styles.middle}>

          {/* LEFT PLAYER */}
          <View style={[styles.vPanel, { width: PANEL }]}>
            <View style={{ transform: [{ rotate: '90deg' }], flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <PlayerContent wind={wind(3)} score={scores[3]} hideWind={rouletting} />
              <RonTsumoButtons />
            </View>
          </View>

          {/* lamp: between left panel and center */}
          <View style={[styles.vLampStrip, { alignItems: 'flex-end' }]}>
            <Lamp on={rouletting ? roulettePos === 3 : dealer === 3} pressable={!rouletting && shimocha === 3} longPressable={!rouletting && dealer === 3} vertical onPress={advanceDealer} onLongPress={roll} />
          </View>

          {/* CENTER */}
          <View style={styles.center}>
            <Text style={styles.roundLabel}>{WINDS[roundWind]} {ROUND_NUMS[roundNum - 1]} 局</Text>
            <Pressable onLongPress={roll} delayLongPress={400} style={styles.diceArea}>
              <View style={styles.diceRow}>
                <DiceCanvas value={dice[0]} rolling={rolling} size={80} />
                <View style={{ width: 8 }} />
                <DiceCanvas value={dice[1]} rolling={rolling} size={80} />
              </View>
            </Pressable>
            <Text style={styles.hint}>長押しでサイコロを振る</Text>
          </View>

          {/* lamp: between center and right panel */}
          <View style={[styles.vLampStrip, { alignItems: 'flex-start' }]}>
            <Lamp on={rouletting ? roulettePos === 1 : dealer === 1} pressable={!rouletting && shimocha === 1} longPressable={!rouletting && dealer === 1} vertical onPress={advanceDealer} onLongPress={roll} />
          </View>

          {/* RIGHT PLAYER */}
          <View style={[styles.vPanel, { width: PANEL }]}>
            <View style={{ transform: [{ rotate: '-90deg' }], flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <PlayerContent wind={wind(1)} score={scores[1]} hideWind={rouletting} />
              <RonTsumoButtons />
            </View>
          </View>

        </View>

        {/* lamp + 本場: between center and bottom panel */}
        <View style={[styles.hLampStrip, { marginHorizontal: 0, alignItems: 'center', justifyContent: 'center' }]}>
          <Lamp on={rouletting ? roulettePos === 0 : dealer === 0} pressable={!rouletting && shimocha === 0} longPressable={!rouletting && dealer === 0} onPress={advanceDealer} onLongPress={roll} />
          <View style={[styles.honbaContainer, { position: 'absolute', right: 60 }]}>
            <Text style={styles.honbaLabel}>本場</Text>
            <TextInput
              style={styles.honbaInput}
              value={String(honba)}
              onChangeText={t => {
                const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                if (!isNaN(n) && n <= 99) setHonba(n);
                else if (t === '') setHonba(0);
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
            <View style={styles.honbaArrows}>
              <Pressable onPress={() => setHonba(h => Math.min(h + 1, 99))} style={styles.arrowBtn}>
                <MaterialIcons name="arrow-drop-up" size={22} color="#ffffff" />
              </Pressable>
              <Pressable onPress={() => setHonba(h => Math.max(h - 1, 0))} style={styles.arrowBtn}>
                <MaterialIcons name="arrow-drop-down" size={22} color="#ffffff" />
              </Pressable>
            </View>
            <Pressable onPress={() => setHonba(0)} style={styles.honbaReset}>
              <MaterialIcons name="refresh" size={18} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        {/* ── BOTTOM PLAYER (自分) ── */}
        <View style={[styles.hPanel, { marginLeft: 110 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <PlayerContent wind={wind(0)} score={scores[0]} hideWind={rouletting} />
            <RonTsumoButtons />
          </View>
        </View>

        {/* Reset button */}
        <Pressable style={styles.resetButton} onPress={reset}>
          <Text style={styles.resetLabel}>リセット</Text>
        </Pressable>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a2e12',
  },
  container: {
    flex: 1,
  },

  // ── Panels ──────────────────────────────────────────────
  hPanel: {
    height: PANEL,
    marginHorizontal: PANEL,
    backgroundColor: '#12122a',
    borderColor: '#c8a84b',
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
    flexDirection: 'row',
  },
  vPanel: {
    backgroundColor: '#12122a',
    borderColor: '#c8a84b',
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  // ── Lamp strips (between panels and center) ──────────────
  hLampStrip: {
    height: LAMP_STRIP,
    marginHorizontal: PANEL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vLampStrip: {
    width: LAMP_STRIP,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Lamp ─────────────────────────────────────────────────
  // Outer shell (button frame)
  lampOuter: {
    width: 68,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0d0d1a',
    borderWidth: 1.5,
    borderColor: '#2a2a40',
    alignItems: 'center',
    justifyContent: 'center',
    // pressed-in look: top-shadow
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  lampOuterV: {
    width: 28,
    height: 68,
    borderRadius: 14,
  },
  lampOuterOn: {
    borderColor: '#cc2020',
    shadowColor: '#ff0000',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  // Inner glow capsule
  lampInner: {
    width: '70%',
    height: '55%',
    borderRadius: 4,
    backgroundColor: '#252538',
  },
  lampInnerOn: {
    backgroundColor: '#ff3030',
    shadowColor: '#ff0000',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },

  // ── Player content ───────────────────────────────────────
  playerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  windBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#c8a84b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  windText: {
    color: '#0a0a18',
    fontSize: 18,
    fontWeight: '800',
  },
  scoreText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // ── Center content ───────────────────────────────────────
  roundLabel: {
    color: '#c8a84b',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 3,
  },
  diceArea: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(200,168,75,0.35)',
  },
  diceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },


  ronTsumoContainer: {
    flexDirection: 'column',
    gap: 5,
  },
  ronBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#7a1010',
    alignItems: 'center',
  },
  tsumoBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#1a3a6b',
    alignItems: 'center',
  },
  ronTsumoText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  hint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
  },

  resetButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  resetLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  honbaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  honbaLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  honbaInput: {
    width: 44,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  honbaArrows: {
    flexDirection: 'column',
    gap: 2,
  },
  arrowBtn: {
    padding: 1,
  },
  arrowText: {
    fontSize: 14,
    lineHeight: 16,
  },
  honbaReset: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
