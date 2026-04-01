import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { DiceCanvas } from './components/DiceCanvas';

const WINDS = ['東', '南', '西', '北'];
const ROUND_NUMS = ['一', '二', '三', '四'];
const PANEL = 62;
const LAMP_STRIP = 28;

function TsumoOverlay({ dealer, tsumoWinner, honba, tsumoFromDealer, tsumoFromChild, setTsumoFromDealer, setTsumoFromChild, onCancel, onConfirm }: {
  dealer: number; tsumoWinner: number; honba: number;
  tsumoFromDealer: string; tsumoFromChild: string;
  setTsumoFromDealer: (v: string) => void;
  setTsumoFromChild: (v: string) => void;
  onCancel: () => void;
  onConfirm: (total: number, isDealer: boolean, dealerPay: number, childPay: number) => void;
}) {
  const isDealer = tsumoWinner === dealer;
  const childPts = parseInt(tsumoFromChild, 10) || 0;
  const dealerPts = parseInt(tsumoFromDealer, 10) || 0;
  const honbaBonus = honba * 100;
  const totalReceived = isDealer
    ? (childPts + honbaBonus) * 3
    : (dealerPts + honbaBonus) + (childPts + honbaBonus) * 2;

  const handleConfirm = () => {
    const cPts = parseInt(tsumoFromChild, 10);
    const dPts = isDealer ? 0 : parseInt(tsumoFromDealer, 10);
    if (!isNaN(cPts) && cPts > 0 && (isDealer || (!isNaN(dPts) && dPts > 0))) {
      const childPay = cPts + honba * 100;
      const dealerPay = isDealer ? 0 : dPts + honba * 100;
      const total = isDealer ? childPay * 3 : dealerPay + childPay * 2;
      onConfirm(total, isDealer, dealerPay, childPay);
    } else {
      onCancel();
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.modalOverlay]}>
      <View style={styles.modalBox}>
        <Text style={styles.modalTitle}>ツモ</Text>
        {!isDealer && (
          <>
            <Text style={styles.modalLabel}>親から</Text>
            <TextInput
              style={styles.modalInput}
              value={tsumoFromDealer}
              onChangeText={setTsumoFromDealer}
              keyboardType="number-pad"
              placeholder="例：3900"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
          </>
        )}
        <Text style={styles.modalLabel}>子から（各）</Text>
        <TextInput
          style={styles.modalInput}
          value={tsumoFromChild}
          onChangeText={setTsumoFromChild}
          keyboardType="number-pad"
          placeholder="例：2000"
          placeholderTextColor="rgba(255,255,255,0.3)"
        />
        {honba > 0 && (
          <View style={styles.honbaBreakdown}>
            <Text style={styles.honbaBreakdownText}>
              本場：各 +{honbaBonus}（{honba}本場 × 100）
            </Text>
            <Text style={styles.honbaTotal}>
              合計受取：{totalReceived.toLocaleString()}点
            </Text>
          </View>
        )}
        <View style={styles.modalButtons}>
          <Pressable style={styles.modalCancelBtn} onPress={onCancel}>
            <Text style={styles.modalCancelText}>キャンセル</Text>
          </Pressable>
          <Pressable style={styles.modalConfirmBtn} onPress={handleConfirm}>
            <Text style={styles.modalConfirmText}>決定</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function RonTsumoButtons({ onRon, onTsumo }: { onRon: () => void; onTsumo: () => void }) {
  return (
    <View style={styles.ronTsumoContainer}>
      <Pressable style={styles.ronBtn} onPress={onRon}>
        <Text style={styles.ronTsumoText}>ロン</Text>
      </Pressable>
      <Pressable style={styles.tsumoBtn} onPress={onTsumo}>
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
  const [ronVisible, setRonVisible] = useState(false);
  const [ronWinner, setRonWinner] = useState(0); // position of ロン declarer
  const [ronFrom, setRonFrom] = useState(0); // 0=東,1=南,2=西,3=北
  const [ronPoints, setRonPoints] = useState('');
  const [tsumoVisible, setTsumoVisible] = useState(false);
  const [tsumoWinner, setTsumoWinner] = useState(0);
  const [tsumoFromDealer, setTsumoFromDealer] = useState('');
  const [tsumoFromChild, setTsumoFromChild] = useState('');

  // positions: 0=bottom, 1=right, 2=top, 3=left (clockwise)
  // dealer = 東, next clockwise = 南, then 西, then 北
  const wind = (pos: number) => WINDS[(pos - dealer + 4) % 4];

  // 下家 = 東家の右隣（次の親）
  const shimocha = (dealer + 1) % 4;

  const openTsumoModal = useCallback((winnerPos: number) => {
    setTsumoWinner(winnerPos);
    setTsumoFromDealer('');
    setTsumoFromChild('');
    setTsumoVisible(true);
  }, []);

  const openRonModal = useCallback((winnerPos: number) => {
    const winnerWindIndex = (winnerPos - dealer + 4) % 4;
    const firstValid = [0, 1, 2, 3].find(i => i !== winnerWindIndex) ?? 1;
    setRonWinner(winnerPos);
    setRonFrom(firstValid);
    setRonPoints('');
    setRonVisible(true);
  }, [dealer]);

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
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.container}>

        {/* ── TOP PLAYER ── */}
        <View style={[styles.hPanel, { marginLeft: 96 }]}>
          <View style={{ transform: [{ rotate: '180deg' }], flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <PlayerContent wind={wind(2)} score={scores[2]} hideWind={rouletting} />
            <RonTsumoButtons onRon={() => openRonModal(2)} onTsumo={() => openTsumoModal(2)} />
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
              <RonTsumoButtons onRon={() => openRonModal(3)} onTsumo={() => openTsumoModal(3)} />
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
                <DiceCanvas value={dice[0]} rolling={rolling} size={64} paused={ronVisible || tsumoVisible} />
                <View style={{ width: 8 }} />
                <DiceCanvas value={dice[1]} rolling={rolling} size={64} paused={ronVisible || tsumoVisible} />
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
              <RonTsumoButtons onRon={() => openRonModal(1)} onTsumo={() => openTsumoModal(1)} />
            </View>
          </View>

        </View>

        {/* lamp + 本場: between center and bottom panel */}
        <View style={[styles.hLampStrip, { marginHorizontal: 0, alignItems: 'center', justifyContent: 'center' }]}>
          <Lamp on={rouletting ? roulettePos === 0 : dealer === 0} pressable={!rouletting && shimocha === 0} longPressable={!rouletting && dealer === 0} onPress={advanceDealer} onLongPress={roll} />
          <View style={[styles.honbaContainer, { position: 'absolute', right: 50 }]}>
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
        <View style={[styles.hPanel, { marginLeft: 96 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <PlayerContent wind={wind(0)} score={scores[0]} hideWind={rouletting} />
            <RonTsumoButtons onRon={() => openRonModal(0)} onTsumo={() => openTsumoModal(0)} />
          </View>
        </View>

        {/* Reset button */}
        <Pressable style={styles.resetButton} onPress={reset}>
          <Text style={styles.resetLabel}>リセット</Text>
        </Pressable>

      </View>

      {/* ツモ オーバーレイ */}
      {tsumoVisible && <TsumoOverlay
        dealer={dealer}
        tsumoWinner={tsumoWinner}
        honba={honba}
        tsumoFromDealer={tsumoFromDealer}
        tsumoFromChild={tsumoFromChild}
        setTsumoFromDealer={setTsumoFromDealer}
        setTsumoFromChild={setTsumoFromChild}
        onCancel={() => { setTsumoVisible(false); setTsumoFromDealer(''); setTsumoFromChild(''); }}
        onConfirm={(total, isDealer, dealerPay, childPay) => {
          setScores(s => s.map((sc, i) => {
            if (i === tsumoWinner) return sc + total;
            if (!isDealer && i === dealer) return sc - dealerPay;
            if (i !== tsumoWinner) return sc - childPay;
            return sc;
          }));
          if (isDealer) setHonba(h => h + 1);
          else setHonba(0);
          setTsumoVisible(false);
          setTsumoFromDealer('');
          setTsumoFromChild('');
        }}
      />}

      {/* ロン オーバーレイ */}
      {ronVisible && (
        <View style={[StyleSheet.absoluteFill, styles.modalOverlay]}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>ロン</Text>

            <Text style={styles.modalLabel}>どの家から？</Text>
            <View style={styles.windSelector}>
              {WINDS.map((w, i) => {
                const winnerWindIndex = (ronWinner - dealer + 4) % 4;
                if (i === winnerWindIndex) return null;
                return (
                  <Pressable
                    key={w}
                    style={[styles.windOption, ronFrom === i && styles.windOptionSelected]}
                    onPress={() => setRonFrom(i)}
                  >
                    <Text style={[styles.windOptionText, ronFrom === i && styles.windOptionTextSelected]}>{w}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.modalLabel}>点数</Text>
            <TextInput
              style={styles.modalInput}
              value={ronPoints}
              onChangeText={setRonPoints}
              keyboardType="number-pad"
              placeholder="例：8000"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            {honba > 0 && (
              <View style={styles.honbaBreakdown}>
                <Text style={styles.honbaBreakdownText}>
                  本場：+{(honba * 300).toLocaleString()}（{honba}本場 × 300）
                </Text>
                <Text style={styles.honbaTotal}>
                  合計：{((parseInt(ronPoints, 10) || 0) + honba * 300).toLocaleString()}点
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelBtn} onPress={() => { setRonVisible(false); setRonPoints(''); }}>
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmBtn} onPress={() => {
                const pts = parseInt(ronPoints, 10);
                if (!isNaN(pts) && pts > 0) {
                  const total = pts + honba * 300;
                  const loserPos = (ronFrom + dealer) % 4;
                  setScores(s => s.map((sc, i) => {
                    if (i === ronWinner) return sc + total;
                    if (i === loserPos) return sc - total;
                    return sc;
                  }));
                  if (ronWinner === dealer) setHonba(h => h + 1);
                  else setHonba(0);
                }
                setRonVisible(false);
                setRonPoints('');
              }}>
                <Text style={styles.modalConfirmText}>決定</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a2e12',
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
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
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#c8a84b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  windText: {
    color: '#0a0a18',
    fontSize: 15,
    fontWeight: '800',
  },
  scoreText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // ── Center content ───────────────────────────────────────
  roundLabel: {
    color: '#c8a84b',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
  },
  diceArea: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(200,168,75,0.35)',
  },
  diceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },


  // ── Modal ────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: 300,
    backgroundColor: '#12122a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#c8a84b',
    gap: 12,
  },
  modalTitle: {
    color: '#c8a84b',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  windSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  windOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  windOptionSelected: {
    borderColor: '#c8a84b',
    backgroundColor: 'rgba(200,168,75,0.2)',
  },
  windOptionText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontWeight: '700',
  },
  windOptionTextSelected: {
    color: '#c8a84b',
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '600',
  },
  honbaBreakdown: {
    backgroundColor: 'rgba(200,168,75,0.1)',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  honbaBreakdownText: {
    color: 'rgba(200,168,75,0.8)',
    fontSize: 12,
  },
  honbaTotal: {
    color: '#c8a84b',
    fontSize: 15,
    fontWeight: '700',
  },

  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#7a1010',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
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
