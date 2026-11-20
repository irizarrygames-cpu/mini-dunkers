// ===== Name & identity ==============================================
// Temporary title. Change GAME_NAME to rename every visible title.
// STORAGE_KEY stays fixed so saved progress survives a rename.
const GAME_NAME = tl('Mini Dunkers');
const GAME_SLOGANS = [tl('SMALL PLAYERS'), tl('BIG MOMENTS!'), tl('PLAY TOGETHER!'), tl('DUNK!')];
const STORAGE_KEY = 'mini-dunkers.v1';

const CFG = {
  // The court (world units). Blue attacks the right-hand hoop, red the left. Real proportions,
  // roughly: 28 m by 15 m, so a metre is about 64 units along and 67 across.
  FIELD_W: 1800,
  FIELD_H: 1000,
  SIDE_M: 52,        // the fence round the court sits this far outside the sidelines
  END_M: 74,         // and this far behind the baselines (room for the hoop's stand)
  CHAMFER: 40,       // cut corners so the ball never dies in one
  TILT: 0.8,         // vertical squash: the "very slight tilt"

  // ---- the hoops (one at each end, on the middle line)
  HOOP_IN: 105,      // the middle of the rim, in from the baseline
  RIM_R: 18,         // the rim's radius (the ball is 10: two balls across, as on a real hoop)
  RIM_Z: 108,        // the rim's height (a player is about 70 tall: 3.05 m against 2 m)
  BOARD_IN: 74,      // the backboard, in from the baseline
  BOARD_W: 124,      // and how wide it is
  BOARD_Z0: 92, BOARD_Z1: 172,   // its bottom and top edge
  // ---- the lines
  KEY_D: 372, KEY_W: 320,        // the paint: how far it comes out from the baseline, how wide
  FT_R: 112,                     // the free-throw circle
  THREE_R: 445,                  // the 3-point arc, from the middle of the rim
  THREE_SIDE: 66,                // the corner 3: straight lines this far in from the sidelines (434 from the
                                 // rim's line, inside the arc's 445, so they meet it 98 out from the rim)
  CIRCLE_R: 112,                 // the centre circle
  // ---- where a shot is which
  DUNK_R: 150,       // close enough to the rim to dunk it
  LAYUP_R: 240,      // close enough for a layup

  PLAYER_R: 15,
  KEEPER_R: 15,      // (no keepers in basketball: kept so old code that sizes one still works)
  BALL_R: 10,

  SPEED: 330,
  SPEED_WITH_BALL: 300,
  KEEPER_SPEED: 330,
  ACCEL: 12,
  HUMAN_ACCEL: 22,
  HUMAN_DECEL: 28,
  STEP: 1 / 120,
  MATCH_MINUTES: 2,  // every match, offline and online (server/game.js MATCH_MINUTES says the same)

  // ---- the ball
  GRAVITY: 1300,
  BALL_BOUNCE: 0.72,     // a basketball bounces: about three quarters back up
  BALL_FRICTION: 1.1,    // rolling on the floor
  BALL_AIR_DRAG: 0.08,
  WALL_BOUNCE: 0.5,
  DRIBBLE_H: 32,         // how high the dribble comes up
  REACH: 64,             // how high a player standing can catch it (hands up)
  JUMP_V: 420,           // a jump (about 68 up, 0.65 s in the air)
  DUNK_V: 470,           // a dunk goes higher
  CONTROL_MAX: 1400,     // (a basketball is caught, whatever the speed)

  // ---- passing
  PASS_MIN: 700,
  PASS_MAX: 1000,
  PASS_CHARGE_FULL: 0.5,  // hold PASS for a lob over the top
  PASS_CHARGE_TAP: 0.1,

  // ---- shooting: hold SHOOT and let go at the top of the meter
  METER_T: 0.62,          // how long the meter takes to fill
  PERFECT_LO: 0.84,       // let go in here: a perfect release (green)
  PERFECT_HI: 0.98,
  GOOD_LO: 0.68,          // in here: a good one
  CHARGE_AUTO: 0.9,       // held this long it goes by itself, late
  CHARGE_MED: 0.2, CHARGE_STRONG: 0.45, CHARGE_FULL: 0.62, CHARGE_POW: 0.55,   // (the meter's sound)

  POWER_MAX: 100,
  // ULT: ON FIRE. Only your own baskets, assists, steals, blocks and skill moves fill it; then the
  // next shot you take, from anywhere, goes in with the ball on fire.
  ULT_MAX: 100,
  ULT_GOAL: 9,
  ULT_SKILL: 1,
  ULT_ASSIST: 5,
  ULT_TACKLE: 4,
  OVERTIME_SECONDS: 90,
  SHOT_CLOCK: 12,         // PRO MATCH: seconds to get a shot up
};
// (kept for the parts of the game that still ask where "the goal" is: the backboard's span)
let GOAL_Y1 = (CFG.FIELD_H - CFG.BOARD_W) / 2;
let GOAL_Y2 = GOAL_Y1 + CFG.BOARD_W;
const OUTLINE = '#161a33';

const TEAMS = {
  blue: { name: tl('BLUE'), dir: 1, jersey: '#2f7bff', shade: '#1b56d8', accent: '#ffffff', shorts: '#1a2350', socks: '#ffffff', shoes: '#1b1d33', fx: '#46d9ff', board: '#2464e8', lip: '#6aa2ff' },
  red:  { name: tl('RED'), dir: -1, jersey: '#ff3a3f', shade: '#c81f2b', accent: '#1b1d33', shorts: '#1b1d33', socks: '#ff3a3f', shoes: '#1b1d33', fx: '#ff5a3c', board: '#e3303a', lip: '#ff8a8e' },
};
const KEEPER_KITS = {
  blue: { jersey: '#a35cff', shade: '#7a3ad8', accent: '#ffffff', shorts: '#2a1f4d', socks: '#a35cff', shoes: '#1b1d33', gloves: '#ffffff' },
  red:  { jersey: '#ffc21a', shade: '#e09a00', accent: '#1b1d33', shorts: '#1b1d33', socks: '#ffc21a', shoes: '#1b1d33', gloves: '#ffffff' },
};

const SKINS = ['#f6cfa6', '#e9b489', '#c98b5e', '#a8693f', '#f2c49b', '#7a4a2a'];
const HAIR_COLORS = ['#2b1d14', '#4a2e1c', '#6b3f22', '#1b1b2a', '#f2c230', '#b8521f'];

// Characters have real ratings (45–95). 70 is what the bots play at.
// spd: run speed · sht: shot power + beating keepers · pas: pass speed · ctl: close dribbling,
// shrugging off tackles, shorter skill cooldown · def: tackle reach, success and cooldown.
// ===== SIGNATURE SKILLS ==============================================
// What the skill button does, when you are carrying a move of your own.
//
//   ball   how the ball leaves you. speed/lift are how hard and how high; keep means it stays
//          at your feet; back sends it behind you; drop leaves it where it is.
//   self   what happens to you: burst (free running speed), dodge (tackles miss), hop (off the
//          ground), kick (the leg animation), turn (which way you end up facing).
//   hit    what it does to defenders within radius: stun them, knock them back, put them down.
//   fx     the picture: a ring, sparks, a burst, stars, or the ground shaking.
//
// Nothing here can score, pass or tackle for you — a signature move buys you a moment, and what
// you do with the moment is still yours.
const SKILLS = [
  { id: 'classic', name: tl('Classic'), rarity: 'starter', read: true,
    blurb: tl('Reads the stick: a crossover, a spin, a burst, a stepback or a hesitation, whichever the moment wants.') },

  // ---- rare: a trick, cleanly done
  { id: 'rainbow', name: tl('Between the Legs'), rarity: 'rare', say: tl('BETWEEN THE LEGS!'), color: '#ffc21a',
    ball: { keep: true }, self: { hop: 0.34, dodge: 0.4, burst: 0.5, kick: 0.2 },
    fx: { kind: 'ring', color: '#ffc21a', r0: 8, r1: 34, life: 0.3 }, meter: 6,
    blurb: tl('Through the legs into the other hand, and gone before they can reach.') },
  { id: 'stepover', name: tl('Hesitation'), rarity: 'rare', say: tl('HESI!'), color: '#ffffff',
    ball: { keep: true }, self: { dodge: 0.52, turn: 'aim' }, hit: { radius: 46, stun: 0.3 },
    fx: { kind: 'ring', color: '#ffffff', r0: 6, r1: 30, life: 0.26 }, meter: 4,
    blurb: tl('Stop dead, sell the pull-up, and go while they are still believing it.') },
  { id: 'dragback', name: tl('Stepback'), rarity: 'rare', say: tl('STEPBACK!'), color: '#86e8e2',
    ball: { keep: true, back: true }, self: { dodge: 0.45, turn: 'reverse', kick: 0.2 },
    fx: { kind: 'ring', color: '#86e8e2', r0: 4, r1: 22, life: 0.24 }, meter: 4,
    blurb: tl('A hop back away from whoever is on you, ball and all.') },
  { id: 'heelflick', name: tl('Behind the Back'), rarity: 'rare', say: tl('BEHIND THE BACK!'), color: '#ff8af0',
    ball: { keep: true }, self: { burst: 0.6, dodge: 0.3, kick: 0.18 }, hit: { radius: 40, stun: 0.25 },
    fx: { kind: 'sparks', color: '#ff8af0', n: 10, speed: 120 }, meter: 5,
    blurb: tl('Round your back without breaking stride, and past them on the other side.') },
  { id: 'roulette', name: tl('Spin Move'), rarity: 'rare', say: tl('SPIN MOVE!'), color: '#9ad1ff',
    ball: { keep: true }, self: { dodge: 0.5, spin: 1, turn: 'aim' },
    fx: { kind: 'ring', color: '#9ad1ff', r0: 6, r1: 28, life: 0.26 }, meter: 5,
    blurb: tl('Turn right through the reach with the ball tucked in tight.') },
  { id: 'scoopturn', name: tl('Pull-Back'), rarity: 'rare', say: tl('PULL-BACK!'), color: '#ffd166',
    ball: { keep: true, back: true }, self: { dodge: 0.46, turn: 'reverse', kick: 0.2 },
    fx: { kind: 'ring', color: '#ffd166', r0: 5, r1: 24, life: 0.24 }, meter: 4,
    blurb: tl('Pull it back across your body and go the way you came.') },
  { id: 'toepoke', name: tl('Quick First Step'), rarity: 'rare', say: tl('FIRST STEP!'), color: '#ff8a1f',
    ball: { keep: true }, self: { burst: 0.55, dodge: 0.28, kick: 0.16 }, hit: { radius: 38, stun: 0.22 },
    fx: { kind: 'sparks', color: '#ff8a1f', n: 9, speed: 130 }, meter: 5,
    blurb: tl('No warning, no wind-up. Gone.') },
  { id: 'shoulderdrop', name: tl('Shoulder Fake'), rarity: 'rare', say: tl('FAKE!'), color: '#c2f5f1',
    ball: { keep: true }, self: { dodge: 0.55, turn: 'aim' }, hit: { radius: 44, stun: 0.28 },
    fx: { kind: 'burst', color: '#c2f5f1', size: 20 }, meter: 5,
    blurb: tl('Lean one way hard enough that they buy it, then go the other.') },
  { id: 'chopcut', name: tl('In-and-Out'), rarity: 'rare', say: tl('IN AND OUT!'), color: '#86e8e2',
    ball: { keep: true }, self: { dodge: 0.5, burst: 0.35, turn: 'aim', kick: 0.18 },
    fx: { kind: 'ring', color: '#86e8e2', r0: 5, r1: 26, life: 0.25 }, meter: 5,
    blurb: tl('Fake the crossover, keep it in the same hand, and leave them reaching.') },

  // ---- epic: the ones that make people stand up
  { id: 'elastico', name: tl('Killer Crossover'), rarity: 'epic', say: tl('KILLER CROSS!'), color: '#b04dff',
    ball: { keep: true }, self: { dodge: 0.62, burst: 0.45, turn: 'aim' }, hit: { radius: 54, stun: 0.34 },
    fx: { kind: 'ring', color: '#b04dff', r0: 6, r1: 38, life: 0.3, width: 4 }, meter: 7,
    blurb: tl('Snap it one way, take it the other, all in one bounce.') },
  { id: 'sombrero', name: tl('Eurostep'), rarity: 'epic', say: tl('EUROSTEP!'), color: '#ffe14d',
    ball: { keep: true }, self: { burst: 0.75, dodge: 0.45, hop: 0.3 }, hit: { radius: 52, stun: 0.3 },
    fx: { kind: 'stars' }, meter: 8,
    blurb: tl('One step one way, the next step the other, and past them before they turn.') },
  { id: 'spincycle', name: tl('Double Spin'), rarity: 'epic', say: tl('DOUBLE SPIN!'), color: '#46d9ff',
    ball: { keep: true }, self: { dodge: 0.7, spin: 2, turn: 'aim' },
    fx: { kind: 'ring', color: '#46d9ff', r0: 10, r1: 44, life: 0.36, width: 4 }, meter: 7,
    blurb: tl('Two turns, not one. Nobody follows the second.') },
  { id: 'ghoststep', name: tl('Ghost Dribble'), rarity: 'epic', say: tl('GHOST!'), color: '#c2f5f1',
    ball: { keep: true }, self: { dodge: 0.85, burst: 0.6, ghost: true },
    fx: { kind: 'burst', color: '#c2f5f1', size: 26 }, meter: 8,
    blurb: tl('For a moment there is nothing there to steal.') },
  { id: 'blindturn', name: tl('Reverse Pivot'), rarity: 'epic', say: tl('PIVOT!'), color: '#ffffff',
    ball: { keep: true, back: true }, self: { dodge: 0.55, burst: 0.7, turn: 'reverse' }, hit: { radius: 48, stun: 0.3 },
    fx: { kind: 'ring', color: '#ffffff', r0: 8, r1: 36, life: 0.3 }, meter: 7,
    blurb: tl('Turn without looking and go back the way you came, faster.') },
  { id: 'akka', name: tl('Combo Dribble'), rarity: 'epic', say: tl('COMBO!'), color: '#ffb0f0',
    ball: { keep: true }, self: { hop: 0.32, burst: 0.7, dodge: 0.42 }, hit: { radius: 48, stun: 0.28 },
    fx: { kind: 'stars' }, meter: 8,
    blurb: tl('Between the legs, behind the back and through the lot of them.') },
  { id: 'crossover', name: tl('Snatch Back'), rarity: 'epic', say: tl('SNATCH BACK!'), color: '#7fdcff',
    ball: { keep: true }, self: { dodge: 0.65, burst: 0.5, turn: 'aim' }, hit: { radius: 50, stun: 0.32 },
    fx: { kind: 'ring', color: '#7fdcff', r0: 6, r1: 36, life: 0.28, width: 4 }, meter: 7,
    blurb: tl('Across your body and back again, before their first foot has landed.') },
  { id: 'pendulum', name: tl('Pendulum'), rarity: 'epic', say: tl('PENDULUM!'), color: '#b04dff',
    ball: { keep: true }, self: { dodge: 0.68, spin: 1.5, turn: 'aim' }, hit: { radius: 46, stun: 0.3 },
    fx: { kind: 'ring', color: '#b04dff', r0: 8, r1: 40, life: 0.34, width: 4 }, meter: 8,
    blurb: tl('Swing it one way, then all the way back through where they are standing.') },
  { id: 'slipstream', name: tl('Slipstream'), rarity: 'epic', say: tl('SLIPSTREAM!'), color: '#46d9ff',
    ball: { keep: true }, self: { burst: 0.95, dodge: 0.4 },
    fx: { kind: 'sparks', color: '#46d9ff', n: 16, speed: 170, life: 0.34 }, meter: 7,
    blurb: tl('Tuck in behind them and come out the other side at speed.') },
  { id: 'flipflap', name: tl('Yo-Yo Dribble'), rarity: 'epic', say: tl('YO-YO!'), color: '#ffe14d',
    ball: { keep: true }, self: { dodge: 0.7, burst: 0.45, turn: 'aim' }, hit: { radius: 52, stun: 0.3 },
    fx: { kind: 'burst', color: '#ffe14d', size: 26 }, meter: 8,
    blurb: tl('Out and back on a string. The second one is the one that does it.') },

  // ---- legendary: now it is a weapon
  { id: 'tornado', name: tl('Tornado'), rarity: 'legendary', say: tl('TORNADO!'), color: '#7fdcff',
    ball: { keep: true }, self: { dodge: 0.7, spin: 2, turn: 'aim' }, hit: { radius: 76, stun: 0.5, push: 170 },
    fx: { kind: 'ring', color: '#7fdcff', r0: 12, r1: 76, life: 0.42, width: 5, shake: 3 }, meter: 10,
    blurb: tl('Spin hard enough and everyone near you goes with it.') },
  { id: 'blink', name: tl('Blink'), rarity: 'legendary', say: tl('BLINK!'), color: '#b04dff',
    ball: { keep: true }, self: { dodge: 0.5, burst: 0.8, dash: 86 },
    fx: { kind: 'burst', color: '#b04dff', size: 30, shake: 2 }, meter: 10,
    blurb: tl('Gone from here, already there, ball and all.') },
  { id: 'afterburn', name: tl('Afterburn'), rarity: 'legendary', say: tl('AFTERBURN!'), color: '#ff5a1f',
    ball: { keep: true }, self: { burst: 1.25, dodge: 0.45 },
    fx: { kind: 'sparks', color: '#ff5a1f', n: 22, speed: 200, life: 0.4 }, meter: 9,
    blurb: tl('Light it up and simply leave.') },
  { id: 'matador', name: tl('Matador'), rarity: 'legendary', say: tl('OLE!'), color: '#f0343f',
    ball: { keep: true }, self: { dodge: 0.95, turn: 'aim' }, hit: { radius: 66, stun: 0.4, fall: true },
    fx: { kind: 'ring', color: '#f0343f', r0: 10, r1: 58, life: 0.36, width: 4 }, meter: 10,
    blurb: tl('Step aside and let them go past you into the floor.') },
  { id: 'shadowstep', name: tl('Shadow Step'), rarity: 'legendary', say: tl('SHADOW!'), color: '#8b4dff',
    ball: { keep: true }, self: { dodge: 0.8, burst: 0.8, ghost: true, decoy: true },
    fx: { kind: 'burst', color: '#8b4dff', size: 28 }, meter: 10,
    blurb: tl('Leave something behind for them to chase.') },
  { id: 'whirlpool', name: tl('Whirlpool'), rarity: 'legendary', say: tl('WHIRLPOOL!'), color: '#2f7bff',
    ball: { keep: true }, self: { dodge: 0.7, spin: 2, turn: 'aim' }, hit: { radius: 72, stun: 0.48, push: 150 },
    fx: { kind: 'ring', color: '#2f7bff', r0: 12, r1: 72, life: 0.4, width: 5, shake: 3 }, meter: 10,
    blurb: tl('Everything near you gets pulled round and spat back out.') },
  { id: 'mirage', name: tl('Mirage'), rarity: 'legendary', say: tl('MIRAGE!'), color: '#ffd166',
    ball: { keep: true }, self: { dodge: 0.9, burst: 0.7, ghost: true },
    fx: { kind: 'burst', color: '#ffd166', size: 30 }, meter: 10,
    blurb: tl('They commit to where you look like you are. You are not there.') },
  { id: 'thunderclap', name: tl('Thunderclap'), rarity: 'legendary', say: tl('CLAP!'), color: '#ffffff',
    ball: { keep: true }, self: { dodge: 0.6, burst: 0.5 }, hit: { radius: 80, stun: 0.5, push: 190, fall: true },
    fx: { kind: 'ring', color: '#ffffff', r0: 14, r1: 80, life: 0.4, width: 6, shake: 4 }, meter: 11,
    blurb: tl('One sound, and everyone within range is on the floor.') },
  { id: 'rocketheel', name: tl('Rocket Launch'), rarity: 'legendary', say: tl('ROCKET!'), color: '#ff5a1f',
    ball: { keep: true }, self: { burst: 1, dodge: 0.4, kick: 0.2 }, hit: { radius: 56, stun: 0.35 },
    fx: { kind: 'sparks', color: '#ff5a1f', n: 24, speed: 220, life: 0.4, shake: 2 }, meter: 10,
    blurb: tl('Hit the gas off the bounce and leave everyone standing.') },
  { id: 'frostbite', name: tl('Frostbite'), rarity: 'legendary', say: tl('FROZEN!'), color: '#bfe0ff',
    ball: { keep: true }, self: { dodge: 0.65, burst: 0.4 }, hit: { radius: 84, stun: 0.62 },
    fx: { kind: 'ring', color: '#bfe0ff', r0: 12, r1: 84, life: 0.46, width: 5 }, meter: 11,
    blurb: tl('Nobody around you moves for a moment. You do.') },

  // ---- mythic: the ones people talk about afterwards
  { id: 'thunderstep', name: tl('Thunder Step'), rarity: 'mythic', say: tl('THUNDER!'), color: '#ffe14d',
    ball: { keep: true }, self: { dodge: 0.7, burst: 0.7 }, hit: { radius: 96, stun: 0.6, push: 230, fall: true },
    fx: { kind: 'ring', color: '#ffe14d', r0: 14, r1: 96, life: 0.44, width: 6, shake: 5, flash: 0.18 }, meter: 12,
    blurb: tl('Put your foot down and the court answers.') },
  { id: 'zerog', name: tl('Zero Gravity'), rarity: 'mythic', say: tl('ZERO G!'), color: '#86e8e2',
    ball: { keep: true, float: 220 }, self: { dodge: 0.8, hop: 0.6, burst: 0.7 }, hit: { radius: 70, stun: 0.45 },
    fx: { kind: 'ring', color: '#86e8e2', r0: 10, r1: 70, life: 0.5, width: 4 }, meter: 12,
    blurb: tl('You and the ball stop obeying the usual rules for a second.') },
  { id: 'timeskip', name: tl('Time Skip'), rarity: 'mythic', say: tl('TIME SKIP!'), color: '#c2f5f1',
    ball: { keep: true }, self: { dodge: 0.9, burst: 0.9, dash: 54 }, hit: { radius: 110, stun: 0.7 },
    fx: { kind: 'ring', color: '#c2f5f1', r0: 16, r1: 110, life: 0.5, width: 5, flash: 0.14 }, meter: 13,
    blurb: tl('Everyone else takes a moment to catch up with where you went.') },
  { id: 'phoenix', name: tl('Phoenix Dash'), rarity: 'mythic', say: tl('PHOENIX!'), color: '#ff8a1f',
    ball: { keep: true }, self: { dodge: 0.75, burst: 1.1, dash: 60 }, hit: { radius: 86, stun: 0.5, push: 200 },
    fx: { kind: 'sparks', color: '#ff8a1f', n: 28, speed: 240, life: 0.45, shake: 4, flash: 0.14 }, meter: 13,
    blurb: tl('Go up in flames and come out of them already running.') },
  { id: 'starfall', name: tl('Starfall'), rarity: 'mythic', say: tl('STARFALL!'), color: '#ffffff',
    ball: { keep: true }, self: { burst: 1.0, dodge: 0.6, hop: 0.4 }, hit: { radius: 80, stun: 0.45 },
    fx: { kind: 'stars', shake: 3 }, meter: 13,
    blurb: tl('Bounce it up into the lights and catch it on the run.') },
  { id: 'goatwalk', name: tl('GOAT Walk'), rarity: 'mythic', say: tl('GOAT!'), color: '#ffc21a',
    ball: { keep: true, glue: true }, self: { dodge: 1.15, burst: 1.0, turn: 'aim' }, hit: { radius: 92, stun: 0.55, push: 150 },
    fx: { kind: 'ring', color: '#ffc21a', r0: 12, r1: 92, life: 0.5, width: 6, shake: 4, flash: 0.2 }, meter: 14,
    blurb: tl('Walk. Nobody takes it off you. That is the whole move.') },
  { id: 'novastep', name: tl('Nova Step'), rarity: 'mythic', say: tl('NOVA!'), color: '#ffb0f0',
    ball: { keep: true }, self: { dodge: 0.8, burst: 0.9, dash: 64 }, hit: { radius: 100, stun: 0.6, push: 210 },
    fx: { kind: 'sparks', color: '#ffb0f0', n: 30, speed: 250, life: 0.46, shake: 4, flash: 0.16 }, meter: 13,
    blurb: tl('Go off like something in the sky and arrive somewhere else entirely.') },
  { id: 'blackout', name: tl('Blackout'), rarity: 'mythic', say: tl('BLACKOUT!'), color: '#8b4dff',
    ball: { keep: true, glue: true }, self: { dodge: 1, burst: 0.8, ghost: true }, hit: { radius: 90, stun: 0.58 },
    fx: { kind: 'burst', color: '#8b4dff', size: 34, shake: 3, flash: 0.18 }, meter: 13,
    blurb: tl('The lights go out. When they come back you are through to the rim.') },
  { id: 'riptide', name: tl('Riptide'), rarity: 'mythic', say: tl('RIPTIDE!'), color: '#2f7bff',
    ball: { keep: true, float: 200 }, self: { dodge: 0.85, hop: 0.5, burst: 0.8 }, hit: { radius: 96, stun: 0.5, push: 240, fall: true },
    fx: { kind: 'ring', color: '#2f7bff', r0: 14, r1: 96, life: 0.5, width: 6, shake: 4 }, meter: 13,
    blurb: tl('The floor goes out from under everybody but you.') },
  { id: 'eclipsestep', name: tl('Eclipse Step'), rarity: 'mythic', say: tl('ECLIPSE!'), color: '#c2f5f1',
    ball: { keep: true, glue: true }, self: { dodge: 1.1, burst: 0.9, dash: 50 }, hit: { radius: 94, stun: 0.56, push: 170 },
    fx: { kind: 'ring', color: '#c2f5f1', r0: 16, r1: 94, life: 0.5, width: 6, flash: 0.16 }, meter: 14,
    blurb: tl('Everything goes quiet and dark, and then you are past.') },
  { id: 'infinityturn', name: tl('Infinity Turn'), rarity: 'mythic', say: tl('INFINITY!'), color: '#ff3a6e',
    ball: { keep: true, glue: true }, self: { dodge: 1.2, spin: 2, burst: 0.8, turn: 'aim' }, hit: { radius: 100, stun: 0.6, push: 180, fall: true },
    fx: { kind: 'ring', color: '#ff3a6e', r0: 14, r1: 100, life: 0.52, width: 6, shake: 5, flash: 0.2 }, meter: 14,
    blurb: tl('Turn, and keep turning, and come out of it still holding the ball.') },

  // ---- build 121: five more, each inside the numbers of other moves of its own grade
  { id: 'icecut', name: tl('Ice Cut'), rarity: 'rare', say: tl('ICE CUT!'), color: '#bfe9ff',
    ball: { keep: true }, self: { dodge: 0.5, burst: 0.4, turn: 'aim', kick: 0.18 }, hit: { radius: 42, stun: 0.26 },
    fx: { kind: 'sparks', color: '#bfe9ff', n: 10, speed: 120 }, meter: 5,
    blurb: tl('A cut so sharp your shoes squeak, like a skate on ice.') },
  { id: 'fallingleaf', name: tl('Falling Leaf'), rarity: 'rare', say: tl('FALLING LEAF!'), color: '#e8742a',
    ball: { keep: true }, self: { hop: 0.3, dodge: 0.38, burst: 0.45, kick: 0.2 },
    fx: { kind: 'ring', color: '#e8742a', r0: 8, r1: 32, life: 0.3 }, meter: 6,
    blurb: tl('A floating hang-dribble that drifts past them like a leaf.') },
  { id: 'snowglobe', name: tl('Snow Globe'), rarity: 'epic', say: tl('SNOW GLOBE!'), color: '#dff3ff',
    ball: { keep: true }, self: { dodge: 0.66, spin: 1.5, turn: 'aim' }, hit: { radius: 48, stun: 0.3 },
    fx: { kind: 'stars' }, meter: 7,
    blurb: tl('Spin round with the ball and leave everyone near you shaken up.') },
  { id: 'avalanche', name: tl('Avalanche'), rarity: 'legendary', say: tl('AVALANCHE!'), color: '#dff3ff',
    ball: { keep: true }, self: { dodge: 0.62, burst: 0.5 }, hit: { radius: 78, stun: 0.48, push: 180, fall: true },
    fx: { kind: 'ring', color: '#dff3ff', r0: 12, r1: 78, life: 0.45, width: 5, shake: 4 }, meter: 11,
    blurb: tl('Everything comes down at once, and everyone near you goes with it.') },
  { id: 'northernlights', name: tl('Northern Lights'), rarity: 'mythic', say: tl('NORTHERN LIGHTS!'), color: '#5fffc4',
    ball: { keep: true, glue: true }, self: { dodge: 1, burst: 0.85, ghost: true }, hit: { radius: 90, stun: 0.56 },
    fx: { kind: 'ring', color: '#5fffc4', r0: 16, r1: 90, life: 0.5, width: 6, flash: 0.16 }, meter: 13,
    blurb: tl('The sky lights up green, and while they look up you are gone.') },
];
const SKILL_IDS = new Set(SKILLS.map((s) => s.id));
const skillDef = (id) => SKILLS.find((s) => s.id === id) || SKILLS[0];

const RARITIES = {
  starter:   { name: tl('STARTER'),   color: '#8a90b8' },
  common:    { name: tl('COMMON'),    color: '#3fcf4a' },
  rare:      { name: tl('RARE'),      color: '#2f7bff' },
  epic:      { name: tl('EPIC'),      color: '#a35cff' },
  legendary: { name: tl('LEGENDARY'), color: '#ffb400' },
  mythic:    { name: tl('MYTHIC'),    color: '#ff3a6e' },
  oneofone:  { name: tl('ONE OF ONE'), color: '#ffe14d' },
  season:    { name: tl('SEASON'),    color: '#ff3a6e' }, // a season pass's own items (build 122)
};
const CHARACTERS = [
  { id: 'street',     name: 'Street',      rarity: 'starter',   r: { spd: 62, sht: 58, pas: 60, ctl: 60, def: 56 }, hair: 'cap',      hairColor: '#4a2e1c', skin: '#f2c49b', cap: '#2f7bff' },
  { id: 'striker',    name: 'Striker',     rarity: 'starter',   r: { spd: 58, sht: 64, pas: 56, ctl: 58, def: 54 }, hair: 'messy',    hairColor: '#2b1d14', skin: '#f6cfa6' },
  { id: 'buzz',       name: 'Buzz',        rarity: 'common',    r: { spd: 64, sht: 60, pas: 60, ctl: 62, def: 72 }, hair: 'buzz',     hairColor: '#2b1d14', skin: '#7a4a2a' },
  { id: 'curly',      name: 'Curly',       rarity: 'common',    r: { spd: 64, sht: 62, pas: 72, ctl: 68, def: 60 }, hair: 'curly',    hairColor: '#6b3f22', skin: '#c98b5e' },
  { id: 'speedster',  name: 'Speedster',   rarity: 'common',    r: { spd: 78, sht: 60, pas: 58, ctl: 66, def: 56 }, hair: 'spikes',   hairColor: '#f2c230', skin: '#e9b489' },
  { id: 'captain',    name: 'Captain',     rarity: 'rare',      r: { spd: 70, sht: 72, pas: 76, ctl: 72, def: 74 }, hair: 'headband', hairColor: '#1b1b2a', skin: '#a8693f', band: '#ffffff' },
  { id: 'bandit',     name: 'Bandit',      rarity: 'rare',      r: { spd: 78, sht: 70, pas: 66, ctl: 78, def: 64 }, hair: 'bandana',  hairColor: '#2b1d14', skin: '#e9b489', band: '#ff3a3f' },
  { id: 'beanie',     name: 'Beanie',      rarity: 'rare',      r: { spd: 72, sht: 78, pas: 70, ctl: 72, def: 68 }, hair: 'beanie',   hairColor: '#6b3f22', skin: '#f6cfa6', cap: '#ff8a1f' },
  { id: 'turbo',      name: 'Turbo',       rarity: 'rare',      r: { spd: 84, sht: 66, pas: 70, ctl: 76, def: 60 }, hair: 'goggles',  hairColor: '#b8521f', skin: '#f6cfa6' },
  { id: 'ninja',      name: 'Ninja',       rarity: 'epic',      r: { spd: 86, sht: 74, pas: 72, ctl: 86, def: 72 }, hair: 'ninja',    hairColor: '#1b1b2a', skin: '#f2c49b', band: '#ff3a3f' },
  { id: 'mohawk',     name: 'Mohawk',      rarity: 'epic',      r: { spd: 80, sht: 86, pas: 70, ctl: 76, def: 78 }, hair: 'mohawk',   hairColor: '#ff3a8a', skin: '#c98b5e' },
  { id: 'robot',      name: 'Robot',       rarity: 'epic',      r: { spd: 76, sht: 80, pas: 86, ctl: 80, def: 86 }, hair: 'robot',    hairColor: '#9aa7b8', skin: '#cfd8e3' },
  { id: 'viking',     name: 'Viking',      rarity: 'epic',      r: { spd: 72, sht: 84, pas: 72, ctl: 74, def: 92 }, hair: 'viking',   hairColor: '#e07b2a', skin: '#f2c49b' },
  { id: 'afroking',   name: 'Afro King',   rarity: 'legendary', r: { spd: 86, sht: 88, pas: 88, ctl: 90, def: 80 }, hair: 'afro',     hairColor: '#1b1b2a', skin: '#7a4a2a' },
  { id: 'phantom',    name: 'Phantom',     rarity: 'legendary', r: { spd: 94, sht: 86, pas: 82, ctl: 92, def: 76 }, hair: 'ponytail', hairColor: '#5b4bd6', skin: '#e9b489' },
  { id: 'goldenboot', name: 'Golden Boot', rarity: 'legendary', r: { spd: 90, sht: 95, pas: 90, ctl: 92, def: 84 }, hair: 'crown',    hairColor: '#2b1d14', skin: '#f2c49b' },
  // the middle of the shop: 25 players between the starters and the top shelf
  { id: 'rookie', name: 'Rookie', rarity: 'common', r: { spd: 60, sht: 58, pas: 62, ctl: 60, def: 58 }, hair: 'flat', hairColor: '#4a2e1c', skin: '#f2c49b' },
  { id: 'hustle', name: 'Hustle', rarity: 'common', r: { spd: 62, sht: 60, pas: 58, ctl: 62, def: 64 }, hair: 'fade', hairColor: '#2b1d14', skin: '#7a4a2a' },
  { id: 'scrappy', name: 'Scrappy', rarity: 'common', r: { spd: 60, sht: 62, pas: 64, ctl: 60, def: 60 }, hair: 'shaggy', hairColor: '#6b3f22', skin: '#e9b489' },
  { id: 'dash', name: 'Dash', rarity: 'common', r: { spd: 72, sht: 58, pas: 56, ctl: 62, def: 54 }, hair: 'spikes', hairColor: '#ff8a1f', skin: '#f6cfa6' },
  { id: 'bounce', name: 'Bounce', rarity: 'common', r: { spd: 62, sht: 60, pas: 66, ctl: 66, def: 56 }, hair: 'curly', hairColor: '#f2c230', skin: '#f2c49b' },
  { id: 'cleats', name: 'Cleats', rarity: 'common', r: { spd: 64, sht: 64, pas: 60, ctl: 58, def: 66 }, hair: 'buzz', hairColor: '#b8521f', skin: '#e9b489' },
  { id: 'tinker', name: 'Tinker', rarity: 'common', r: { spd: 60, sht: 62, pas: 70, ctl: 64, def: 58 }, hair: 'goggles', hairColor: '#3fcf4a', skin: '#c98b5e' },
  { id: 'braidz', name: 'Braidz', rarity: 'common', r: { spd: 66, sht: 58, pas: 64, ctl: 68, def: 58 }, hair: 'braids', hairColor: '#1b1b2a', skin: '#7a4a2a', band: '#ffe14d' },
  { id: 'topknot', name: 'Topknot', rarity: 'common', r: { spd: 62, sht: 66, pas: 62, ctl: 64, def: 62 }, hair: 'topknot', hairColor: '#2b1d14', skin: '#f6cfa6', band: '#ffffff' },
  { id: 'curtains', name: 'Curtains', rarity: 'common', r: { spd: 64, sht: 62, pas: 68, ctl: 66, def: 58 }, hair: 'curtains', hairColor: '#8a5a2b', skin: '#f2c49b' },
  { id: 'fringe', name: 'Fringe', rarity: 'common', r: { spd: 66, sht: 64, pas: 62, ctl: 70, def: 56 }, hair: 'emo', hairColor: '#1b1b2a', skin: '#f6cfa6' },
  { id: 'tank', name: 'Tank', rarity: 'common', r: { spd: 58, sht: 68, pas: 58, ctl: 56, def: 76 }, hair: 'flattop', hairColor: '#2b1d14', skin: '#a8693f' },
  { id: 'sparky', name: 'Sparky', rarity: 'common', r: { spd: 68, sht: 66, pas: 58, ctl: 64, def: 60 }, hair: 'mohawk', hairColor: '#46d9ff', skin: '#e9b489' },
  { id: 'winger', name: 'Winger', rarity: 'rare', r: { spd: 80, sht: 66, pas: 68, ctl: 74, def: 58 }, hair: 'ponytail', hairColor: '#4a2e1c', skin: '#c98b5e' },
  { id: 'maestro', name: 'Maestro', rarity: 'rare', r: { spd: 68, sht: 72, pas: 82, ctl: 78, def: 64 }, hair: 'curtains', hairColor: '#d8dce6', skin: '#f2c49b' },
  { id: 'volley', name: 'Volley', rarity: 'rare', r: { spd: 74, sht: 80, pas: 66, ctl: 70, def: 62 }, hair: 'spikes', hairColor: '#ff3a3f', skin: '#f6cfa6' },
  { id: 'anchor', name: 'Anchor', rarity: 'rare', r: { spd: 66, sht: 70, pas: 72, ctl: 68, def: 84 }, hair: 'beanie', hairColor: '#2b1d14', skin: '#7a4a2a', cap: '#1b3a8a' },
  { id: 'shuffle', name: 'Shuffle', rarity: 'rare', r: { spd: 78, sht: 68, pas: 72, ctl: 80, def: 62 }, hair: 'braids', hairColor: '#f2c230', skin: '#e9b489', band: '#ff3a8a' },
  { id: 'cannon', name: 'Cannon', rarity: 'rare', r: { spd: 70, sht: 84, pas: 66, ctl: 70, def: 70 }, hair: 'bandana', hairColor: '#1b1b2a', skin: '#a8693f', band: '#1b1b2a' },
  { id: 'silk', name: 'Silk', rarity: 'rare', r: { spd: 76, sht: 70, pas: 78, ctl: 82, def: 62 }, hair: 'emo', hairColor: '#a35cff', skin: '#f2c49b' },
  { id: 'wall', name: 'The Wall', rarity: 'rare', r: { spd: 64, sht: 68, pas: 70, ctl: 68, def: 88 }, hair: 'fade', hairColor: '#4a4f60', skin: '#c98b5e' },
  { id: 'jester', name: 'Jester', rarity: 'rare', r: { spd: 76, sht: 74, pas: 76, ctl: 78, def: 66 }, hair: 'topknot', hairColor: '#ff3a8a', skin: '#f6cfa6', band: '#ffe14d' },
  { id: 'comet', name: 'Comet', rarity: 'rare', r: { spd: 84, sht: 72, pas: 70, ctl: 76, def: 64 }, hair: 'shaggy', hairColor: '#f4f5f7', skin: '#e9b489' },
  { id: 'tempo', name: 'Tempo', rarity: 'rare', r: { spd: 74, sht: 76, pas: 80, ctl: 76, def: 70 }, hair: 'headband', hairColor: '#2b1d14', skin: '#7a4a2a', band: '#46d9ff' },
  { id: 'vault', name: 'Vault', rarity: 'rare', r: { spd: 72, sht: 78, pas: 74, ctl: 72, def: 80 }, hair: 'goggles', hairColor: '#7a3ad8', skin: '#f2c49b' },
  // the top shelf: every one of these outplays everything above, and costs days to weeks of play
  { id: 'dreads',     name: 'Dreadlock',   rarity: 'epic',      r: { spd: 88, sht: 84, pas: 82, ctl: 88, def: 78 }, hair: 'dreads',   hairColor: '#2b1d14', skin: '#7a4a2a' },
  { id: 'samurai',    name: 'Samurai',     rarity: 'epic',      r: { spd: 86, sht: 86, pas: 80, ctl: 90, def: 84 }, hair: 'samurai',  hairColor: '#1b1b2a', skin: '#f2c49b', band: '#ff3a3f' },
  { id: 'cowboy',     name: 'Cowboy',      rarity: 'epic',      r: { spd: 84, sht: 90, pas: 84, ctl: 82, def: 82 }, hair: 'cowboy',   hairColor: '#8a4b22', skin: '#e9b489', cap: '#a8652c' },
  { id: 'pirate',     name: 'Captain Hook', rarity: 'legendary', r: { spd: 88, sht: 90, pas: 86, ctl: 88, def: 86 }, hair: 'pirate',  hairColor: '#1b1b2a', skin: '#c98b5e' },
  { id: 'knight',     name: 'Knight',      rarity: 'legendary', r: { spd: 84, sht: 88, pas: 86, ctl: 86, def: 96 }, hair: 'knight',   hairColor: '#aab4c6', skin: '#f2c49b', band: '#ff3a3f' },
  { id: 'pharaoh',    name: 'Pharaoh',     rarity: 'legendary', r: { spd: 88, sht: 90, pas: 94, ctl: 90, def: 84 }, hair: 'pharaoh',  hairColor: '#1b1b2a', skin: '#b87a4b' },
  { id: 'shark',      name: 'Shark',       rarity: 'legendary', r: { spd: 96, sht: 90, pas: 84, ctl: 90, def: 86 }, hair: 'shark',    hairColor: '#6f8aa6', skin: '#f6cfa6' },
  { id: 'lion',       name: 'Lion King',   rarity: 'mythic',    r: { spd: 92, sht: 94, pas: 90, ctl: 92, def: 92 }, hair: 'lion',     hairColor: '#e0901f', skin: '#c98b5e' },
  { id: 'wizard',     name: 'Wizard',      rarity: 'mythic',    r: { spd: 90, sht: 94, pas: 97, ctl: 95, def: 88 }, hair: 'wizard',   hairColor: '#e9eef5', skin: '#f2c49b', cap: '#5b3bd6' },
  { id: 'astronaut',  name: 'Astronaut',   rarity: 'mythic',    r: { spd: 95, sht: 92, pas: 92, ctl: 94, def: 90 }, hair: 'astronaut', hairColor: '#e9eef5', skin: '#e9b489' },
  { id: 'iceking',    name: 'Ice King',    rarity: 'mythic',    r: { spd: 94, sht: 95, pas: 92, ctl: 95, def: 94 }, hair: 'ice',      hairColor: '#7fdcff', skin: '#dfeaf5' },
  { id: 'inferno',    name: 'Inferno',     rarity: 'mythic',    r: { spd: 97, sht: 97, pas: 90, ctl: 94, def: 90 }, hair: 'flame',    hairColor: '#ff7a1a', skin: '#e9b489' },
  { id: 'galaxy',     name: 'Galaxy',      rarity: 'mythic',    r: { spd: 96, sht: 96, pas: 96, ctl: 96, def: 92 }, hair: 'galaxy',   hairColor: '#4b2aa8', skin: '#a8693f' },
  { id: 'titan',      name: 'Titan',       rarity: 'mythic',    r: { spd: 94, sht: 98, pas: 94, ctl: 96, def: 98 }, hair: 'flattop',  hairColor: '#1b1b2a', skin: '#7a4a2a' },
  { id: 'goat',       name: 'The GOAT',    rarity: 'mythic',    r: { spd: 99, sht: 99, pas: 98, ctl: 99, def: 95 }, hair: 'goat',     hairColor: '#f4f5f7', skin: '#f2c49b' },
  // ---- the crate shelf: these only come out of crates
  { id: 'blaze',    name: 'Blaze',    rarity: 'rare',      r: { spd: 84, sht: 80, pas: 74, ctl: 78, def: 68 }, hair: 'spikes',    hairColor: '#ff6a1a', skin: '#e9b489' },
  { id: 'frostboy', name: 'Frost',    rarity: 'rare',      r: { spd: 80, sht: 76, pas: 82, ctl: 80, def: 72 }, hair: 'spikes',    hairColor: '#9fe8ff', skin: '#f6cfa6' },
  { id: 'stormer',  name: 'Storm',    rarity: 'rare',      r: { spd: 78, sht: 82, pas: 76, ctl: 76, def: 80 }, hair: 'messy',     hairColor: '#8d93b8', skin: '#c98b5e' },
  { id: 'acecard',  name: 'Ace',      rarity: 'rare',      r: { spd: 82, sht: 78, pas: 80, ctl: 82, def: 70 }, hair: 'fade',      hairColor: '#2b1d14', skin: '#a8693f' },
  { id: 'rocketman',name: 'Rocket',   rarity: 'rare',      r: { spd: 88, sht: 76, pas: 72, ctl: 78, def: 66 }, hair: 'buzz',      hairColor: '#f2c230', skin: '#f2c49b' },
  { id: 'echo',     name: 'Echo',     rarity: 'epic',      r: { spd: 86, sht: 84, pas: 88, ctl: 86, def: 74 }, hair: 'curtains',  hairColor: '#6b3f22', skin: '#f6cfa6' },
  { id: 'novastar', name: 'Nova',     rarity: 'epic',      r: { spd: 90, sht: 86, pas: 82, ctl: 88, def: 72 }, hair: 'ponytail',  hairColor: '#f4f5f7', skin: '#e9b489' },
  { id: 'venomous', name: 'Venom',    rarity: 'epic',      r: { spd: 88, sht: 90, pas: 80, ctl: 84, def: 78 }, hair: 'mohawk',    hairColor: '#7dff3a', skin: '#7a4a2a' },
  { id: 'shade',    name: 'Shade',    rarity: 'epic',      r: { spd: 90, sht: 82, pas: 86, ctl: 90, def: 76 }, hair: 'emo',       hairColor: '#1b1b2a', skin: '#f2c49b' },
  { id: 'boltz',    name: 'Bolt',     rarity: 'epic',      r: { spd: 94, sht: 80, pas: 78, ctl: 86, def: 70 }, hair: 'spikes',    hairColor: '#ffe14d', skin: '#c98b5e' },
  { id: 'tide',     name: 'Tide',     rarity: 'epic',      r: { spd: 84, sht: 86, pas: 92, ctl: 88, def: 80 }, hair: 'shaggy',    hairColor: '#46d9ff', skin: '#f6cfa6' },
  { id: 'emberking',name: 'Ember',    rarity: 'epic',      r: { spd: 86, sht: 92, pas: 80, ctl: 86, def: 76 }, hair: 'braids',    hairColor: '#c2300a', skin: '#a8693f' },
  { id: 'bastion',  name: 'Bastion',  rarity: 'legendary', r: { spd: 86, sht: 90, pas: 90, ctl: 90, def: 96 }, hair: 'knight',    hairColor: '#c9d2de', skin: '#e9b489' },
  { id: 'corsair',  name: 'Corsair',  rarity: 'legendary', r: { spd: 92, sht: 92, pas: 88, ctl: 92, def: 82 }, hair: 'pirate',    hairColor: '#2b1d14', skin: '#c98b5e' },
  { id: 'ronin',    name: 'Ronin',    rarity: 'legendary', r: { spd: 94, sht: 90, pas: 90, ctl: 94, def: 84 }, hair: 'samurai',   hairColor: '#1b1b2a', skin: '#f2c49b' },
  { id: 'sphinx',   name: 'Sphinx',   rarity: 'legendary', r: { spd: 90, sht: 94, pas: 92, ctl: 92, def: 88 }, hair: 'pharaoh',   hairColor: '#ffc21a', skin: '#a8693f' },
  { id: 'tundra',   name: 'Tundra',   rarity: 'legendary', r: { spd: 92, sht: 92, pas: 94, ctl: 92, def: 90 }, hair: 'ice',       hairColor: '#dff6ff', skin: '#f6cfa6' },
  { id: 'magmaman', name: 'Magma',    rarity: 'legendary', r: { spd: 94, sht: 96, pas: 88, ctl: 92, def: 84 }, hair: 'flame',     hairColor: '#ff5a1a', skin: '#7a4a2a' },
  { id: 'oracle',   name: 'Oracle',   rarity: 'legendary', r: { spd: 90, sht: 92, pas: 97, ctl: 95, def: 86 }, hair: 'wizard',    hairColor: '#d8c8ff', skin: '#f2c49b' },
  { id: 'cometkid', name: 'Comet',    rarity: 'legendary', r: { spd: 97, sht: 90, pas: 90, ctl: 94, def: 82 }, hair: 'astronaut', hairColor: '#f4f5f7', skin: '#e9b489' },
  { id: 'seraph',   name: 'Seraph',   rarity: 'mythic',    r: { spd: 96, sht: 97, pas: 98, ctl: 97, def: 92 }, hair: 'crown',     hairColor: '#fff3a0', skin: '#f7dcc6' },
  { id: 'onyx',     name: 'Onyx',     rarity: 'mythic',    r: { spd: 97, sht: 98, pas: 95, ctl: 98, def: 94 }, hair: 'dreads',    hairColor: '#16171d', skin: '#6b4228' },
  { id: 'zenith',   name: 'Zenith',   rarity: 'mythic',    r: { spd: 98, sht: 97, pas: 97, ctl: 99, def: 93 }, hair: 'anime',     hairColor: '#c8d8ff', skin: '#f6cfa6', anime: true },
  { id: 'eclipse',  name: 'Eclipse',  rarity: 'mythic',    r: { spd: 98, sht: 99, pas: 96, ctl: 98, def: 95 }, hair: 'galaxy',    hairColor: '#b04dff', skin: '#c98b5e' },
  { id: 'legendx',  name: 'The Legend', rarity: 'mythic',  r: { spd: 99, sht: 99, pas: 99, ctl: 99, def: 97 }, hair: 'goat',      hairColor: '#ffc21a', skin: '#e9b489' },
  // Jacob: LILOTTER and irizarrygamez1 only. The card shows his own six stats; the three that
  // mean anything on the pitch (pace, ball control, crossing) are what he actually plays at.
  { id: 'jacob', name: 'Jacob', rarity: 'oneofone', only: ['lilotter', 'irizarrygamez1'], thin: 0.55, ovr: 98,
    stats: [[tl('SKINNY'), 99], [tl('PACE'), 21], [tl('BALL CONTROL'), 67], [tl('YAP'), 200], [tl('EXCUSES'), 200], [tl('CROSSING'), 0]],
    r: { spd: 98, sht: 98, pas: 96, ctl: 99, def: 92 }, hair: 'anime', hairColor: '#3aa0ff', skin: '#f6cfa6', anime: true, mewing: true },
  // LILOTTER's own one-of-one. The card says 200; the attributes below are the ceiling the game
  // has (ratingAttr caps at 99, so 200 there would play exactly the same and only break the maths).
  { id: 'flow', name: 'Flow', rarity: 'oneofone', only: ['lilotter'], thin: 0.82, ovr: 200,
    stats: [[tl('PACE'), 188], [tl('SHOOTING'), 200], [tl('FIRST TOUCH'), 200], [tl('BALL CONTROL'), 200], [tl('PASSING'), 176], [tl('DEFENDING'), 142]],
    r: { spd: 99, sht: 99, pas: 99, ctl: 99, def: 99 }, hair: 'anime', hairColor: '#e9e9f2', skin: '#f7dcc6', anime: true },
  // Matt: MattHidalgoCR7 only. The card shows the five numbers he was given; the game has one touch
  // stat, so his 99 dribbling is what ctl plays at (the 69 ball control is on the card). Passing 0 is
  // real: ratingAttr floors it at a pass 10% weaker than an average player's. Overall is set, not worked out.
  { id: 'matt', name: 'Matt', rarity: 'oneofone', only: ['matthidalgocr7'], buff: 1, ovr: 99,
    stats: [[tl('PACE'), 99], [tl('DRIBBLING'), 99], [tl('SHOOTING'), 99], [tl('BALL CONTROL'), 69], [tl('PASSING'), 0]],
    r: { spd: 99, sht: 99, pas: 0, ctl: 99, def: 70 }, hair: 'buzz', hairColor: '#15161c', skin: '#c98b5e' },
];
// Accessories: one slot, worn over any character. slot says where it's drawn on the body.
const ACCESSORIES = [
  { id: 'clownnose',   name: tl('Clown Nose'),      slot: 'face', price: 6000 },
  { id: 'wristbands',  name: tl('Sweatbands'),      slot: 'arm',  price: 7000 },
  { id: 'mustache',    name: tl('Mustache'),        slot: 'face', price: 7500 },
  { id: 'shades',      name: tl('Shades'),          slot: 'face', price: 8000 },
  { id: 'partyhat',    name: tl('Party Hat'),       slot: 'head', price: 8500 },
  { id: 'eyepatch',    name: tl('Eye Patch'),       slot: 'face', price: 9000 },
  { id: 'bowtie',      name: tl('Bow Tie'),         slot: 'neck', price: 9500 },
  { id: 'warpaint',    name: tl('War Paint'),       slot: 'face', price: 10000 },
  { id: 'scarf',       name: tl('Scarf'),           slot: 'neck', price: 11000 },
  { id: 'monocle',     name: tl('Monocle'),         slot: 'face', price: 12000 },
  { id: 'armband',     name: tl('Shooting Sleeve'), slot: 'arm',  price: 13000 },
  { id: 'starshades',  name: tl('Star Shades'),     slot: 'face', price: 14000 },
  { id: 'flowercrown', name: tl('Flower Crown'),    slot: 'head', price: 15000 },
  { id: 'heromask',    name: tl('Hero Mask'),       slot: 'face', price: 16000 },
  { id: 'headphones',  name: tl('Headphones'),      slot: 'head', price: 18000 },
  { id: 'propeller',   name: tl('Propeller Cap'),   slot: 'head', price: 20000 },
  { id: 'visor',       name: tl('Cyber Visor'),     slot: 'face', price: 22000 },
  { id: 'chain',       name: tl('Gold Chain'),      slot: 'neck', price: 25000 },
  { id: 'medal',       name: tl('Gold Medal'),      slot: 'neck', price: 30000 },
  { id: 'horns',       name: tl('Devil Horns'),     slot: 'head', price: 35000 },
  { id: 'halo',        name: tl('Halo'),            slot: 'head', price: 40000 },
  { id: 'cape',        name: tl('Hero Cape'),       slot: 'back', price: 45000 },
  { id: 'goldboots',   name: tl('Golden Sneakers'),    slot: 'feet', price: 50000 },
  { id: 'wings',       name: tl('Angel Wings'),     slot: 'back', price: 60000 },
  { id: 'jetpack',       name: tl('Jetpack'),          slot: 'back', price: 75000 },
  { id: 'royalcrown',    name: tl('Royal Crown'),      slot: 'head', price: 80000 },
  { id: 'diamondshades', name: tl('Diamond Shades'),   slot: 'face', price: 90000 },
  { id: 'lightningvisor',name: tl('Lightning Visor'),  slot: 'face', price: 100000 },
  { id: 'neonhalo',      name: tl('Neon Halo'),        slot: 'head', price: 110000 },
  { id: 'dragonwings',   name: tl('Dragon Wings'),     slot: 'back', price: 125000 },
  { id: 'royalcape',     name: tl('Royal Cape'),       slot: 'back', price: 140000 },
  { id: 'diamondchain',  name: tl('Diamond Chain'),    slot: 'neck', price: 150000 },
  { id: 'worldmedal',    name: tl('World Medal'),      slot: 'neck', price: 160000 },
  { id: 'galaxyboots',   name: tl('Galaxy Sneakers'),     slot: 'feet', price: 175000 },
  { id: 'flameboots',    name: tl('Flame Sneakers'),      slot: 'feet', price: 185000 },
  { id: 'robotarm',      name: tl('Robot Arm'),        slot: 'arm',  price: 195000 },
  { id: 'kingmantle',    name: tl("King's Mantle"),   slot: 'back', price: 210000 },
  { id: 'spacehelmet',   name: tl('Space Helmet'),     slot: 'head', price: 225000 },
  { id: 'dragonmask',    name: tl('Dragon Mask'),      slot: 'face', price: 240000 },
  { id: 'championbelt',  name: tl('Champion Belt'),    slot: 'neck', price: 260000 },
  // ---- the crate shelf: these only come out of crates
  { id: 'beret',        name: tl('Beret'),           slot: 'head', rarity: 'rare',      price: 12000 },
  { id: 'bucket',       name: tl('Bucket Hat'),      slot: 'head', rarity: 'rare',      price: 14000 },
  { id: 'cowboyhat',    name: tl('Cowboy Hat'),      slot: 'head', rarity: 'rare',      price: 16000 },
  { id: 'maskbandit',   name: tl('Bandit Mask'),     slot: 'face', rarity: 'rare',      price: 18000 },
  { id: 'swimgoggles',  name: tl('Swim Goggles'),    slot: 'face', rarity: 'rare',      price: 20000 },
  { id: 'wraps',        name: tl('Hand Wraps'),      slot: 'arm',  rarity: 'rare',      price: 22000 },
  { id: 'backpack',     name: tl('Backpack'),        slot: 'back', rarity: 'rare',      price: 24000 },
  { id: 'antlers',      name: tl('Antlers'),         slot: 'head', rarity: 'epic',      price: 34000 },
  { id: 'tophat',       name: tl('Top Hat'),         slot: 'head', rarity: 'epic',      price: 38000 },
  { id: 'scanvisor',    name: tl('Scan Visor'),      slot: 'face', rarity: 'epic',      price: 42000 },
  { id: 'warstripes',   name: tl('War Stripes'),     slot: 'face', rarity: 'epic',      price: 46000 },
  { id: 'beads',        name: tl('Lucky Beads'),     slot: 'neck', rarity: 'epic',      price: 50000 },
  { id: 'powerband',    name: tl('Power Band'),      slot: 'arm',  rarity: 'epic',      price: 56000 },
  { id: 'neonboots',    name: tl('Neon Sneakers'),      slot: 'feet', rarity: 'epic',      price: 62000 },
  { id: 'firecrown',    name: tl('Crown of Fire'),   slot: 'head', rarity: 'legendary', price: 90000 },
  { id: 'icecrown',     name: tl('Frost Crown'),     slot: 'head', rarity: 'legendary', price: 100000 },
  { id: 'phantommask',  name: tl('Phantom Mask'),    slot: 'face', rarity: 'legendary', price: 115000 },
  { id: 'rubypendant',  name: tl('Ruby Pendant'),    slot: 'neck', rarity: 'legendary', price: 130000 },
  { id: 'gauntlet',     name: tl('Gauntlet'),        slot: 'arm',  rarity: 'legendary', price: 145000 },
  { id: 'icewings',     name: tl('Ice Wings'),       slot: 'back', rarity: 'legendary', price: 165000 },
  { id: 'frostboots',   name: tl('Frost Sneakers'),     slot: 'feet', rarity: 'legendary', price: 185000 },
  { id: 'stormcloud',   name: tl('Storm Cloud'),     slot: 'head', rarity: 'mythic',    price: 280000 },
  { id: 'voidmask',     name: tl('Void Mask'),       slot: 'face', rarity: 'mythic',    price: 330000 },
  { id: 'cosmicchain',  name: tl('Cosmic Chain'),    slot: 'neck', rarity: 'mythic',    price: 390000 },
  { id: 'phoenixwings', name: tl('Phoenix Wings'),   slot: 'back', rarity: 'mythic',    price: 480000 },
];
const ACCESSORY_IDS = new Set(ACCESSORIES.map((a) => a.id));
const ACCESSORY_FACE_IDS = new Set(ACCESSORIES.filter((a) => a.slot === 'face').map((a) => a.id));

// The four ON FIRE shots, picked at random each time one goes off: by the rim a windmill or a
// tomahawk dunk, anywhere else a fadeaway or a skyhook. (Online sends the index: keep the order.)
const ULT_KINDS = ['windmill', 'tomahawk', 'fadeaway', 'skyhook'];
const ULT_NAMES = { windmill: tl('WINDMILL DUNK'), tomahawk: tl('TOMAHAWK DUNK'), fadeaway: tl('FADEAWAY'), skyhook: tl('SKYHOOK') };
const ULT_DUNKS = ['windmill', 'tomahawk'], ULT_SHOTS = ['fadeaway', 'skyhook'];
// near: true by the rim (a dunk), false further out (a shot), anything else any of the four
const randomUlt = (near, rnd = Math.random) => { const pool = near === true ? ULT_DUNKS : near === false ? ULT_SHOTS : ULT_KINDS; return pool[(rnd() * pool.length) | 0]; };
// Every character has a signature finish (an old idea, kept for anything that still shows it).
const SIGNATURES = {};
function sigKind(c) {
  if (!c) return ULT_KINDS[0];
  let h = 0;
  for (let i = 0; i < c.id.length; i++) h = (h * 31 + c.id.charCodeAt(i)) >>> 0;
  return ULT_KINDS[h % ULT_KINDS.length];
}
const sigName = (c) => ULT_NAMES[sigKind(c)];
// the online World Cup's rounds (the server keeps which one you're in)
const WC_ROUNDS = [tl('ROUND OF 16'), tl('QUARTER-FINAL'), tl('SEMI-FINAL'), tl('FINAL')];
const WC_PRIZE = 1000;
// RANKED: online results move your rank points. Tiers are pure thresholds so both sides agree.
// A season lasts SEASON_DAYS and pays out by the tier you finished in.
const CUP_ROUNDS = [tl('THE FINAL'), tl('THE SEMI-FINALS'), tl('THE QUARTER-FINALS')]; // named from the end backwards
const CUP_ROUND_NAMES = [tl('FINAL'), tl('SEMI-FINALS'), tl('QUARTER-FINALS')]; // the same, on their own: "FRIEND CUP · FINAL"
const FCUP_PRIZE = 500; // winning a friend cup

// The thresholds are set against what a ranked match pays (about 11 for a win with a challenge
// or two), so the climb takes the same number of matches it always did.
// (build 118: every season reward seven times what it was — 1,400 for BRONZE up to 350,000 for IMMORTAL)
const RANK_TIERS = [
  { id: 'bronze', name: tl('BRONZE'), at: 0, color: '#c87d3a', reward: 1400 },
  { id: 'silver', name: tl('SILVER'), at: 60, color: '#c9d2e4', reward: 3500 },
  { id: 'gold', name: tl('GOLD'), at: 150, color: '#ffc21a', reward: 8400 },
  { id: 'platinum', name: tl('PLATINUM'), at: 300, color: '#46d9ff', reward: 17500 },
  { id: 'diamond', name: tl('DIAMOND'), at: 500, color: '#b04dff', reward: 35000 },
  { id: 'legend', name: tl('LEGEND'), at: 800, color: '#ff3a6e', reward: 70000 },
  // build 117: five more above LEGEND, each a longer climb than the last
  { id: 'master', name: tl('MASTER'), at: 1100, color: '#3fcf4a', reward: 105000 },
  { id: 'grandmaster', name: tl('GRANDMASTER'), at: 1450, color: '#ff7a1a', reward: 140000 },
  { id: 'champion', name: tl('CHAMPION'), at: 1850, color: '#1f5bff', reward: 192500 },
  { id: 'titan', name: tl('TITAN'), at: 2300, color: '#1b1d33', reward: 262500 },
  { id: 'immortal', name: tl('IMMORTAL'), at: 2800, color: '#ffffff', reward: 350000 },
];
const SEASON_DAYS = 14;
const SEASON_START = Date.UTC(2026, 8, 21); // seasons have counted from here
const seasonNow = () => Math.max(0, Math.floor((Date.now() - SEASON_START) / (SEASON_DAYS * 86400000)));
const seasonEndsAt = (n) => SEASON_START + (n + 1) * SEASON_DAYS * 86400000;

// ===== Season passes (build 122) =====================================
// 5,000 free passes, one for every ranked season from the one that began on 16 Nov 2026: pass 1
// runs in ranked season 5, pass 5,000 ends in the year 2218. Each pass has its own emote, accessory
// and celebration, made in js/pass.js from the pass number, never sold and never repeated. Their ids
// are 'pe' / 'pa' / 'pc' and the pass number: pe1, pa1, pc1 ... pc5000.
const PASS_COUNT = 5000;
const PASS_FIRST = 4; // the ranked season (counted from 0) that pass 1 runs in
const passAt = (ms = Date.now()) => {
  const s = Math.floor((ms - SEASON_START) / (SEASON_DAYS * 86400000)) - PASS_FIRST + 1;
  return s >= 1 && s <= PASS_COUNT ? s : 0;
};
const passNow = () => passAt(Date.now());
const passEndsAt = (n) => seasonEndsAt(n + PASS_FIRST - 1);
const PASS_TAG = { emote: 'pe', accessory: 'pa', celebration: 'pc' };
const passId = (kind, n) => PASS_TAG[kind] + n;
// the pass an item belongs to (1..5000), or 0 when it is not a pass item of that kind
function passNumOf(id, kind) {
  const tag = PASS_TAG[kind];
  if (!tag || typeof id !== 'string' || id.length < 3 || id.length > 6 || id[0] !== tag[0] || id[1] !== tag[1]) return 0;
  const s = id.slice(2);
  if (!/^[1-9][0-9]{0,3}$/.test(s)) return 0;
  const n = Number(s);
  return n >= 1 && n <= PASS_COUNT ? n : 0;
}
function rankTier(rp) {
  let t = RANK_TIERS[0];
  for (const x of RANK_TIERS) if ((rp || 0) >= x.at) t = x;
  return t;
}
function rankNext(rp) {
  const i = RANK_TIERS.indexOf(rankTier(rp));
  return i + 1 < RANK_TIERS.length ? RANK_TIERS[i + 1] : null;
}
// What a ranked match is worth: a win 10 plus a point for every challenge you finished in it,
// a draw 5, and a loss costs 5 (walking out of one counts as a loss). Points never go below
// zero. The challenges only pay when you win. Nothing else in the game moves your rank.
const RANK_CHALLENGE = 1;
const RANK_LOSS = 5;
function rankDelta(outcome, challenges = 0) {
  if (outcome === 'win') return 10 + Math.max(0, challenges | 0) * RANK_CHALLENGE;
  if (outcome === 'draw') return 5;
  return outcome === 'loss' ? -RANK_LOSS : 0;
}
// quick chat: the only things anyone can say in a match (no typing, so nothing nasty gets through)
const QUICK_CHAT = ['HI!', 'NICE ONE!', 'PASS!', 'SHOOT!', 'DEFEND!', 'WHAT A SHOT!', 'THANKS!', 'SORRY!', 'UNLUCKY', 'WOW!', "LET'S GO!", 'GG'];
const ordinal = (n) => {
  const lang = typeof I18N !== 'undefined' ? I18N.lang : 'en';
  if (lang === 'es' || lang === 'pt') return n + '.º';
  if (lang === 'it') return n + 'º';
  if (lang === 'de') return n + '.';
  if (lang === 'fr') return n + (n === 1 ? 'er' : 'e');
  if (lang === 'tr' || lang === 'pl') return n + '.';
  // these say the word for "place" around it in their lines: plaats 3, plats 3, peringkat 3, locul 3
  if (lang === 'nl' || lang === 'sv' || lang === 'id' || lang === 'ro') return String(n);
  return n + (['th', 'st', 'nd', 'rd'][n % 10 > 3 || (n % 100 > 10 && n % 100 < 14) ? 0 : n % 10]);
};
const ULT_COLORS = ['#ff3a3f', '#ff8a1f', '#ffe14d', '#3fcf4a', '#46d9ff', '#b04dff', '#ff4df0'];
// the ult strike burns: outer flame, middle, the hot yellow core
const FIRE_COLS = ['#e8341c', '#ff8a1f', '#ffd23f'];
const fireCol = (t, i = 0) => FIRE_COLS[(Math.floor(t * 9 + i) % 3 + 3) % 3];
const rainbow = (t, i = 0) => ULT_COLORS[(Math.floor(t * 9 + i) % ULT_COLORS.length + ULT_COLORS.length) % ULT_COLORS.length];

const AI_HAIRS = ['messy', 'spikes', 'curly', 'buzz', 'headband', 'messy', 'curly', 'beanie', 'mohawk', 'afro'];

// Bots play as real characters. Each rarity's share of all bots is split evenly across its
// characters, so rarer ones turn up less: a mythic like The GOAT is about 1 bot in 800.
const BOT_RARITY_SHARE = { starter: 35, common: 27, rare: 20, epic: 12, legendary: 5, mythic: 1 };
// online, the players filling an empty spot (after 30s in the queue) play like people who have put the
// hours in: mostly rare-to-legendary characters, the odd mythic
const BOT_RARITY_ONLINE = { starter: 4, common: 12, rare: 30, epic: 30, legendary: 18, mythic: 6 };
function pickBotCharacter(rand = Math.random, share = BOT_RARITY_SHARE) {
  const count = {};
  for (const c of CHARACTERS) count[c.rarity] = (count[c.rarity] || 0) + 1;
  // a character tied to an account is never handed to a bot
  const weight = (c) => (c.only ? 0 : (share[c.rarity] || 0) / count[c.rarity]);
  let roll = rand() * CHARACTERS.reduce((sum, c) => sum + weight(c), 0);
  for (const c of CHARACTERS) { roll -= weight(c); if (roll <= 0) return c; }
  return CHARACTERS[0];
}

const overall = (r) => Math.round((r.spd + r.sht + r.pas + r.ctl + r.def) / 5);

// ===== Your player =====================================================
// There is one player now, yours, and five stats you train with coins. Every level costs more
// than the one before, there is no top level, and each one adds a little less than the last:
// the first is worth about two points, level 10 about three quarters of one, level 50 a fifth.
// 60 is where everyone starts (an ordinary player); the bots offline average about 64.
const STAT_KEYS = ['spd', 'sht', 'pas', 'ctl', 'def'];
const STAT_NAMES = { spd: tl('SPEED'), sht: tl('SHOOTING'), pas: tl('PASSING'), ctl: tl('DRIBBLING'), def: tl('DEFENDING') };
const STAT_BASE = 60;
const STAT_LEVEL_CAP = 2000; // only a guard against a broken save: nobody can afford anywhere near it
const statLevel = (v) => Math.max(0, Math.min(STAT_LEVEL_CAP, Math.floor(Number(v) || 0)));
function statRating(level) { return STAT_BASE + 12 * Math.log(1 + statLevel(level) / 6); }
// what the next level costs from this one
function statCost(level) {
  const L = statLevel(level);
  return Math.min(2e9, Math.round((250 * Math.pow(1.075, L) + 60 * L) / 10) * 10);
}
function statLevels(raw) {
  const o = {};
  for (const k of STAT_KEYS) o[k] = statLevel(raw && raw[k]);
  return o;
}
function statRatings(levels) {
  const L = statLevels(levels), r = {};
  for (const k of STAT_KEYS) r[k] = statRating(L[k]);
  return r;
}
const statOvr = (levels) => overall(statRatings(levels));
// how good your levels make you, as a grade colour (the badge next to your OVR)
function ovrGrade(ovr) {
  return ovr >= 93 ? 'mythic' : ovr >= 86 ? 'legendary' : ovr >= 79 ? 'epic' : ovr >= 72 ? 'rare' : ovr >= 65 ? 'common' : 'starter';
}
// The looks you can give your player, all free: haircuts, colours, skin and build.
const LOOK_HAIRS = ['buzz', 'messy', 'spikes', 'curly', 'afro', 'fade', 'mohawk', 'curtains', 'braids', 'dreads', 'ponytail',
  'topknot', 'flattop', 'shaggy', 'emo', 'anime', 'cap', 'headband', 'beanie', 'bandana'];
const LOOK_HAIR_COLORS = ['#2b1d14', '#4a2e1c', '#6b3f22', '#1b1b2a', '#f2c230', '#b8521f', '#e8e4dc', '#2f7bff', '#ff5fa8', '#3fcf4a'];
const LOOK_CAPS = ['#2f7bff', '#ff3a3f', '#3fcf4a', '#ffc21a', '#1b1d33', '#ffffff', '#a35cff'];
const LOOK_BUILDS = ['normal', 'buff', 'slim'];
const DEFAULT_LOOK = { hair: 'cap', hairColor: '#4a2e1c', skin: '#f2c49b', cap: '#2f7bff', build: 'normal' };
function cleanLook(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const hex = (v, list, d) => (typeof v === 'string' && list.includes(v) ? v : d);
  return {
    hair: LOOK_HAIRS.includes(r.hair) ? r.hair : DEFAULT_LOOK.hair,
    hairColor: hex(r.hairColor, LOOK_HAIR_COLORS, DEFAULT_LOOK.hairColor),
    skin: hex(r.skin, SKINS, DEFAULT_LOOK.skin),
    cap: hex(r.cap, LOOK_CAPS, DEFAULT_LOOK.cap),
    build: LOOK_BUILDS.includes(r.build) ? r.build : 'normal',
  };
}
// accessories: as many as you like at once, each one only once, in the order they were listed
// (season pass ones after the rest, in the order they were put on)
function cleanAccessories(list, owns) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const base = ACCESSORIES.filter((a) => list.includes(a.id) && !seen.has(a.id) && seen.add(a.id) && (!owns || owns(a.id))).map((a) => a.id);
  const pass = list.filter((id) => passNumOf(id, 'accessory') && !seen.has(id) && seen.add(id) && (!owns || owns(id)));
  return base.concat(pass.slice(0, 12));
}
// what a player looks like on the pitch, from a look and the accessories worn
function lookFromCustom(look, accs) {
  const l = cleanLook(look);
  const list = cleanAccessories(accs);
  return { hair: l.hair, hairColor: l.hairColor, skin: l.skin, cap: l.cap, band: '#ffffff', thin: l.build === 'slim' ? 0.82 : 0, buff: l.build === 'buff' ? 1 : 0,
    anime: l.hair === 'anime', mewing: false, acc: list[0] || null, accs: list };
}
// characters can be locked to certain accounts, and can show their own stat lines
const charOk = (c) => !c.only || (typeof Save !== 'undefined' && c.only.includes(String(Save.account || '').toLowerCase()));
const charStats = (c) => c.stats || [[tl('SPD'), c.r.spd], [tl('SHT'), c.r.sht], [tl('PAS'), c.r.pas], [tl('CTL'), c.r.ctl], [tl('DEF'), c.r.def]];
const charOvr = (c) => (c.ovr !== undefined ? c.ovr : overall(c.r));
// rating 70 = 0; 95 ≈ +1; 99 ≈ +1.16; 45 ≈ -1. Kept small on purpose: better, not unfair.
const NEUTRAL_ATTR = { speed: 1, shot: 1, pass: 1, finish: 0, ctl: 0, def: 0 };
function ratingAttr(r) {
  // (no top end for your own stats: a rating past 99 still counts, it is just very dear to get)
  const f = (v) => clamp((v - 70) / 25, -1, 1.6);
  return { speed: 1 + f(r.spd) * 0.08, shot: 1 + f(r.sht) * 0.07, finish: -f(r.sht) * 0.07, pass: 1 + f(r.pas) * 0.1, ctl: f(r.ctl), def: f(r.def) };
}

// ===== Bot difficulty (here so the server can load it) =====
const DIFFICULTY = {
  // How good the bots are at basketball. Noah asked for a game that is actually challenging, so
  // these are tuned by simulation against a scripted player (tools/botscan.js), never by feel.
  //   redSpeed     how fast they run, against a full-speed player at 1
  //   react        seconds between decisions (lower is sharper)
  //   shotPerfect  how often a jump shot is a perfect release; shotGood how often it is a good one
  //   shoot3 / shootMid   how keen they are to take an open three / an open mid-range shot
  //   openBar      how open they need to be to shoot (higher takes more contested shots)
  //   passBar      how much better a teammate's look must be before they give it up
  //   aiSteal      chance, each decision, that an on-ball defender reaches in
  //   stealSkill   how often that reach comes away with it (x the base chance)
  //   slideOnHuman the same against you
  //   blockSkill   how well-timed their jumps at a shooter are
  //   gap          how tight they guard the ball (lower is tighter)
  //   help / rimProtect / board / cut   help defence, jumping with a dunker, crashing the boards, cutting
  //   aiSkill      chance of a dribble move when somebody is on them
  //   mistakes     how often they get it wrong (BOT_MISTAKES), 1 = an average player
  //   (aiSlide, aiDodge, keeperBonus, aiShotNoise: the soccer game's knobs, still read by old code)
  easy:   { redSpeed: 0.93, react: 0.34, shotPerfect: 0.16, shotGood: 0.46, shoot3: 0.4, shootMid: 0.45, openBar: 0.3, passBar: 0.35,
    aiSteal: 0.12, stealSkill: 0.75, slideOnHuman: 0.8, blockSkill: 0.7, gap: 54, help: 0.35, rimProtect: 0.35, board: 0.55, cut: 0.12,
    aiSkill: 0.16, mistakes: 1.35, release: 1.15, aiSlide: 0.2, aiDodge: 0.3, keeperBonus: 0, aiShotNoise: 40 },
  normal: { redSpeed: 0.975, react: 0.26, shotPerfect: 0.27, shotGood: 0.5, shoot3: 0.5, shootMid: 0.55, openBar: 0.32, passBar: 0.3,
    aiSteal: 0.2, stealSkill: 0.95, slideOnHuman: 0.95, blockSkill: 0.95, gap: 46, help: 0.5, rimProtect: 0.5, board: 0.7, cut: 0.18,
    aiSkill: 0.26, mistakes: 1, release: 1, aiSlide: 0.3, aiDodge: 0.4, keeperBonus: 0, aiShotNoise: 32 },
  hard:   { redSpeed: 1.01, react: 0.2, shotPerfect: 0.36, shotGood: 0.47, shoot3: 0.55, shootMid: 0.6, openBar: 0.34, passBar: 0.25,
    aiSteal: 0.27, stealSkill: 1.1, slideOnHuman: 1.08, blockSkill: 1.15, gap: 40, help: 0.65, rimProtect: 0.65, board: 0.82, cut: 0.24,
    aiSkill: 0.34, mistakes: 0.72, release: 0.9, aiSlide: 0.4, aiDodge: 0.45, keeperBonus: 0, aiShotNoise: 24 },
};
// online fill-ins: they stand in for a person when there are not enough, so they are meant to pass
// for one — about "normal", a little less sharp
const ONLINE_BOTS = { ...DIFFICULTY.normal, react: 0.29, shotPerfect: 0.24, aiSteal: 0.17, mistakes: 1.1 };
// your bot teammates offline: steady, a little better than "normal", so your side is never the weak link
const MATE_BASE = { ...DIFFICULTY.normal, redSpeed: 0.99, react: 0.24, shotPerfect: 0.3, mistakes: 0.85 };

// coin counts for display: 999999 stays exact, then 1.25M, 1B
function fmtCoins(n) {
  n = Math.floor(Number(n) || 0);
  // Below a million, group the digits: 125,000 reads at a glance where 125000 has to be counted.
  // Above it the short form is already clearer than any amount of grouping — 2.5M beats
  // 2,500,000 — which is what it is for.
  if (n < 1e6) return (n < 0 ? '-' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const [v, unit] = n >= 1e12 ? [n / 1e12, 'T'] : n >= 1e9 ? [n / 1e9, 'B'] : [n / 1e6, 'M'];
  return (v >= 100 ? Math.floor(v) : Math.floor(v * 100) / 100) + unit;
}

// YOUR level makes every match harder: level 1 plays as before, level 50+ is the full ramp.
// Ranks are just a name for where you are on it.
const LEVEL_RAMP_TOP = 50;
const RANKS = [[1, tl('ROOKIE')], [6, tl('PRO')], [12, tl('STAR')], [20, tl('ELITE')], [30, tl('WORLD CLASS')], [40, tl('LEGEND')], [50, tl('GOAT')]];
const rankFor = (level) => { let n = RANKS[0][1]; for (const [lv, name] of RANKS) if (level >= lv) n = name; return n; };
const levelRampPct = (level) => Math.round(clamp((level - 1) / (LEVEL_RAMP_TOP - 1), 0, 1) * 100);

// sharper (u > 0) or softer (u < 0) at every knob, kept to what is still playable
function sharpen(b, u) {
  return {
    ...b,
    redSpeed: b.redSpeed + u * 0.05,
    react: clamp(b.react * (1 - u * 0.3), 0.14, 0.6),
    shotPerfect: clamp(b.shotPerfect * (1 + u * 0.35), 0.05, 0.55),
    aiSteal: clamp(b.aiSteal * (1 + u * 0.5), 0.04, 0.45),
    stealSkill: clamp(b.stealSkill * (1 + u * 0.2), 0.4, 1.4),
    blockSkill: clamp(b.blockSkill * (1 + u * 0.3), 0.4, 1.5),
    gap: clamp(b.gap * (1 - u * 0.12), 34, 70),
    help: clamp(b.help * (1 + u * 0.4), 0.1, 0.9),
    rimProtect: clamp(b.rimProtect * (1 + u * 0.4), 0.1, 0.9),
    board: clamp(b.board * (1 + u * 0.2), 0.2, 0.95),
    aiSkill: clamp(b.aiSkill * (1 + u * 0.5), 0.05, 0.5),
    mistakes: clamp(b.mistakes * (1 - u * 0.4), 0.3, 2),
  };
}
// The more there are on court, the more room there is to cover: a 3v3 side is sharpened a
// little, 1v1 is eased (one bot on you all match, with nobody on your side to take the weight).
const FORMAT_SHARP = { '3v3': 0.25, '2v2': 0.1, '1v1': -0.25, training: -0.4 };
function formatRamp(b, format) { return sharpen(b, FORMAT_SHARP[format] || 0); }

function playerRamp(b, level) {
  const u = clamp(((level || 1) - 1) / (LEVEL_RAMP_TOP - 1), 0, 1);
  if (u <= 0) return { ...b, playerLevel: level || 1, ramp: 0 };
  return { ...sharpen(b, u * 0.9), slideOnHuman: Math.min(1.25, b.slideOnHuman * (1 + u * 0.25)), playerLevel: level, ramp: u };
}

// a difficulty leaned on by a team's level (0..3): better teams are sharper and slip up less
function levelDiff(b, lv) { return sharpen(b, (lv - 1) * 0.12); }

// Bots make an average player's mistakes, on both teams and online: wayward and badly weighted
// passes, wrong choices of who to pass to, a reach that connects but is mistimed. Chances are per
// action, times the difficulty's mistakes factor.
const BOT_MISTAKES = {
  passAim: 0.05,       // radians of aim wobble on every pass (doubled under pressure)
  passBad: 0.07,       // a pass that is badly off
  wrongPass: 0.3,      // noise when picking who to pass to
  tackleMiss: 0.14,    // a reach that gets there but is mistimed
};

const TRAILS = [
  { id: 'electric', name: tl('Electric'), a: '#46d9ff', b: '#ffffff' },
  { id: 'fire',     name: tl('Fire'),     a: '#ff7a1a', b: '#ffe14d' },
  { id: 'plasma',   name: tl('Plasma Spin'), a: '#b04dff', b: '#f3d2ff' },
  { id: 'blast',    name: tl('White Blast'), a: '#ffffff', b: '#bff3ff' },
  { id: 'frost',    name: tl('Frostbite'), a: '#8fe3ff', b: '#ffffff' },
  { id: 'toxic',    name: tl('Toxic'),     a: '#7dff3a', b: '#e8ffc2' },
  { id: 'shadow',   name: tl('Shadow'),    a: '#7b3bff', b: '#1b1033' },
  { id: 'rainbow',  name: tl('Rainbow'),   a: '#ff5fa8', b: '#ffe14d' },
  { id: 'golden',   name: tl('Golden'),    a: '#ffc21a', b: '#fff3a0' },
  // ---- the crate shelf. bands = [colour, width] from the outside in, spark = what spins off it
  { id: 'sunrise', name: tl('Sunrise'), rarity: 'rare', a: '#ff9a3c', b: '#ffe9a8', bands: [['#ff6a1a', 2.3], ['#ffb03a', 1.4], ['#fff3a0', 0.6]] },
  { id: 'mintfizz', name: tl('Mint Fizz'), rarity: 'rare', a: '#4fe0b0', b: '#eafff7', bands: [['#1f8f6a', 2.2], ['#4fe0b0', 1.2]], spark: 'bubble', sparkA: '#eafff7', sparkB: '#9ff5da' },
  { id: 'bubblegum', name: tl('Bubblegum'), rarity: 'rare', a: '#ff5fa8', b: '#ffd9ec', bands: [['#e03a84', 2.3], ['#ff8ec4', 1.3], ['#ffd9ec', 0.6]], spark: 'bubble', sparkA: '#ffd9ec', sparkB: '#ff8ec4' },
  { id: 'inkwell', name: tl('Inkwell'), rarity: 'rare', a: '#3b4060', b: '#aab0d0', bands: [['#15182a', 2.5], ['#3b4060', 1.4], ['#8d93b8', 0.5]] },
  { id: 'cherry', name: tl('Cherry Blossom'), rarity: 'rare', a: '#ff9ac4', b: '#ffffff', bands: [['#d85a8a', 2.0], ['#ffc8dd', 1.2]], spark: 'petal', sparkA: '#ffd9e8', sparkB: '#ff9ac4' },
  { id: 'lagoon', name: tl('Lagoon'), rarity: 'epic', a: '#2fd0e0', b: '#dffcff', bands: [['#0d7b8f', 2.4], ['#2fd0e0', 1.4], ['#dffcff', 0.6]], spark: 'bubble', sparkA: '#dffcff', sparkB: '#7fe8f5' },
  { id: 'sandstorm', name: tl('Sandstorm'), rarity: 'epic', a: '#d8a95a', b: '#f6e3bd', bands: [['#8a6a2a', 2.5], ['#d8a95a', 1.5], ['#f6e3bd', 0.7]], spark: 'dust', sparkA: '#f6e3bd', sparkB: '#d8a95a' },
  { id: 'bloodmoon', name: tl('Blood Moon'), rarity: 'epic', a: '#c2143c', b: '#ff8a6a', bands: [['#5a0a1a', 2.6], ['#c2143c', 1.5], ['#ff8a6a', 0.6]], spark: 'ring', sparkA: '#ff8a6a', sparkB: '#c2143c' },
  { id: 'circuit', name: tl('Circuit'), rarity: 'epic', a: '#39ff88', b: '#0d1b2a', bands: [['#0d1b2a', 2.4], ['#1f8f5a', 1.4], ['#39ff88', 0.6]], spark: 'cube', sparkA: '#39ff88', sparkB: '#aaffcf' },
  { id: 'starlight', name: tl('Starlight'), rarity: 'epic', a: '#bfe9ff', b: '#ffffff', bands: [['#4a7fd8', 2.2], ['#bfe9ff', 1.2], ['#ffffff', 0.5]], spark: 'star', sparkA: '#ffffff', sparkB: '#bfe9ff' },
  { id: 'aurora', name: tl('Aurora'), rarity: 'epic', a: '#5fffc4', b: '#b04dff', bands: [['#2a7fd8', 2.6], ['#5fffc4', 1.7], ['#b04dff', 0.9], ['#ffffff', 0.4]], spark: 'star', sparkA: '#eaffff', sparkB: '#b04dff' },
  { id: 'honey', name: tl('Honeycomb'), rarity: 'epic', a: '#ffb400', b: '#fff0b8', bands: [['#a86f00', 2.3], ['#ffb400', 1.4], ['#fff0b8', 0.6]], spark: 'cube', sparkA: '#ffd166', sparkB: '#fff0b8' },
  { id: 'nightfall', name: tl('Nightfall'), rarity: 'legendary', a: '#6a2ad8', b: '#1b1033', bands: [['#0d0820', 2.8], ['#4b1f9a', 1.7], ['#8a3fd8', 0.8]], spark: 'star', sparkA: '#d8c8ff', sparkB: '#8a3fd8' },
  { id: 'firework', name: tl('Firework'), rarity: 'legendary', a: '#ff3a6e', b: '#ffe14d', bands: [['#ff3a6e', 2.4], ['#ffe14d', 1.5], ['#46d9ff', 0.8], ['#ffffff', 0.4]], spark: 'burstspark', sparkA: '#ffffff', sparkB: '#ffe14d' },
  { id: 'tsunami', name: tl('Tsunami'), rarity: 'legendary', a: '#1e6fd8', b: '#dff6ff', bands: [['#0a3a7a', 2.7], ['#1e6fd8', 1.7], ['#7fc8ff', 0.9], ['#ffffff', 0.4]], spark: 'bubble', sparkA: '#ffffff', sparkB: '#7fc8ff' },
  { id: 'magmatrail', name: tl('Magma'), rarity: 'legendary', a: '#ff5a1a', b: '#2b1a1a', bands: [['#2b1a1a', 2.7], ['#c2300a', 1.8], ['#ff7a1a', 1.0], ['#ffd166', 0.4]], spark: 'ember', sparkA: '#ff7a1a', sparkB: '#ffd166' },
  { id: 'spectre', name: tl('Spectre'), rarity: 'legendary', a: '#b9bfe8', b: '#3b4060', bands: [['#2a2d45', 2.6], ['#6a71a0', 1.6], ['#d8dcff', 0.7]], spark: 'ghost', sparkA: '#d8dcff', sparkB: '#8d93b8' },
  { id: 'jetstream', name: tl('Jetstream'), rarity: 'legendary', a: '#ffffff', b: '#46d9ff', bands: [['#1f8fd8', 2.5], ['#7fe0ff', 1.5], ['#ffffff', 0.7]], spark: 'bolt', sparkA: '#ffffff', sparkB: '#46d9ff' },
  { id: 'confetti', name: tl('Confetti'), rarity: 'legendary', a: '#ffe14d', b: '#ff5fa8', bands: [['#ffffff', 2.2], ['#ffe14d', 1.2]], spark: 'confetti', sparkA: '#ff5fa8', sparkB: '#46d9ff' },
  { id: 'hologram', name: tl('Hologram'), rarity: 'legendary', a: '#46d9ff', b: '#ff5fa8', bands: [['#46d9ff', 2.5], ['#ff5fa8', 1.6], ['#ffffff', 0.7]], spark: 'cube', sparkA: '#46d9ff', sparkB: '#ff5fa8' },
  { id: 'supernova', name: tl('Supernova'), rarity: 'mythic', a: '#fff3a0', b: '#ff8a1f', bands: [['#ff8a1f', 3.0], ['#ffd166', 2.0], ['#fff3a0', 1.1], ['#ffffff', 0.5]], spark: 'ring', sparkA: '#ffffff', sparkB: '#ffd166' },
  { id: 'blackhole', name: tl('Black Hole'), rarity: 'mythic', a: '#8a3fd8', b: '#07060f', bands: [['#07060f', 3.2], ['#2a1a4a', 2.1], ['#6a2ad8', 1.1], ['#d8c8ff', 0.4]], spark: 'ring', sparkA: '#b04dff', sparkB: '#07060f' },
  { id: 'dragonfire', name: tl('Dragonfire'), rarity: 'mythic', a: '#ff7a1a', b: '#ffc21a', bands: [['#8c1020', 3.0], ['#ff5a1a', 2.0], ['#ffb03a', 1.1], ['#fff3a0', 0.5]], spark: 'ember', sparkA: '#ffc21a', sparkB: '#ff5a1a' },
  { id: 'celestial', name: tl('Celestial'), rarity: 'mythic', a: '#ffffff', b: '#ffd166', bands: [['#2a3f8a', 3.0], ['#7fb3ff', 2.0], ['#ffffff', 1.1], ['#ffd166', 0.5]], spark: 'star', sparkA: '#ffffff', sparkB: '#ffd166' },
  { id: 'infinitytrail', name: tl('Infinity'), rarity: 'mythic', a: '#ff3a6e', b: '#46d9ff', bands: [['#ff3a6e', 3.1], ['#ff8a1f', 2.4], ['#ffe14d', 1.8], ['#3fcf4a', 1.3], ['#46d9ff', 0.8], ['#b04dff', 0.4]], spark: 'star', sparkA: '#ffffff', sparkB: '#ffe14d' },
  // ---- build 121: fifteen more, with three new things to spin off them (snowflakes, leaves, notes)
  { id: 'snowfall', name: tl('Snowfall'), rarity: 'rare', a: '#dff3ff', b: '#ffffff', bands: [['#7fb3e8', 2.2], ['#dff3ff', 1.3], ['#ffffff', 0.5]], spark: 'flake', sparkA: '#ffffff', sparkB: '#bfe3ff' },
  { id: 'autumnleaves', name: tl('Autumn Leaves'), rarity: 'rare', a: '#e8742a', b: '#ffd166', bands: [['#8a3a12', 2.3], ['#e8742a', 1.4], ['#ffb03a', 0.6]], spark: 'leaf', sparkA: '#e8742a', sparkB: '#c2300a' },
  { id: 'candycane', name: tl('Candy Cane'), rarity: 'rare', a: '#ff3a3f', b: '#ffffff', bands: [['#ffffff', 2.3], ['#ff3a3f', 1.5], ['#ffffff', 0.7]], spark: 'confetti', sparkA: '#ff3a3f', sparkB: '#ffffff' },
  { id: 'sherbet', name: tl('Sherbet'), rarity: 'rare', a: '#ffb07a', b: '#ff8ac4', bands: [['#ff8ac4', 2.2], ['#ffb07a', 1.3], ['#fff3c8', 0.6]], spark: 'bubble', sparkA: '#fff3c8', sparkB: '#ff8ac4' },
  { id: 'discotrail', name: tl('Disco'), rarity: 'epic', a: '#c04dff', b: '#46d9ff', bands: [['#2a0f4a', 2.5], ['#c04dff', 1.5], ['#46d9ff', 0.7]], spark: 'note', sparkA: '#ffe14d', sparkB: '#ff5fa8' },
  { id: 'evergreen', name: tl('Evergreen'), rarity: 'epic', a: '#2f8f45', b: '#dfffe0', bands: [['#14532a', 2.4], ['#2f8f45', 1.4], ['#8fdc7a', 0.6]], spark: 'leaf', sparkA: '#3fcf4a', sparkB: '#14532a' },
  { id: 'thunderstorm', name: tl('Thunderstorm'), rarity: 'epic', a: '#5b6475', b: '#ffe14d', bands: [['#2a2f3d', 2.6], ['#5b6475', 1.6], ['#b3bccc', 0.7]], spark: 'bolt', sparkA: '#ffe14d', sparkB: '#ffffff' },
  { id: 'melody', name: tl('Melody'), rarity: 'epic', a: '#2f7bff', b: '#ffffff', bands: [['#0d2f7a', 2.3], ['#2f7bff', 1.4], ['#bfe0ff', 0.6]], spark: 'note', sparkA: '#ffffff', sparkB: '#bfe0ff' },
  { id: 'blizzard', name: tl('Blizzard'), rarity: 'legendary', a: '#bfe9ff', b: '#ffffff', bands: [['#4a7fd8', 2.8], ['#9fd5ff', 1.8], ['#e8f6ff', 0.9], ['#ffffff', 0.4]], spark: 'flake', sparkA: '#ffffff', sparkB: '#9fd5ff' },
  { id: 'harvestmoon', name: tl('Harvest Moon'), rarity: 'legendary', a: '#ff9a1f', b: '#ffe9a8', bands: [['#5a2a0a', 2.7], ['#c2601a', 1.7], ['#ff9a1f', 0.9], ['#ffe9a8', 0.4]], spark: 'leaf', sparkA: '#ffb03a', sparkB: '#c2300a' },
  { id: 'bassdrop', name: tl('Bass Drop'), rarity: 'legendary', a: '#39ff88', b: '#0d1b2a', bands: [['#0d1b2a', 2.8], ['#16171d', 1.8], ['#39ff88', 0.9], ['#ffffff', 0.3]], spark: 'note', sparkA: '#39ff88', sparkB: '#ff4df0' },
  { id: 'galaxyswirl', name: tl('Galaxy Swirl'), rarity: 'legendary', a: '#6a2ad8', b: '#46d9ff', bands: [['#120a30', 2.9], ['#4b1f9a', 1.9], ['#46d9ff', 0.9], ['#ffffff', 0.4]], spark: 'star', sparkA: '#ffffff', sparkB: '#46d9ff' },
  { id: 'fourseasons', name: tl('Four Seasons'), rarity: 'mythic', a: '#ffb03a', b: '#9fd5ff', bands: [['#2f8f45', 3.0], ['#ff9ac4', 2.1], ['#ffb03a', 1.3], ['#ffffff', 0.6]], spark: 'seasons', sparkA: '#ffffff', sparkB: '#ff9ac4' },
  { id: 'encore', name: tl('Encore'), rarity: 'mythic', a: '#ff3a6e', b: '#ffe14d', bands: [['#ff3a6e', 3.0], ['#ffe14d', 2.0], ['#46d9ff', 1.2], ['#ffffff', 0.5]], spark: 'note', sparkA: '#ffffff', sparkB: '#ffe14d' },
  { id: 'polarnight', name: tl('Polar Night'), rarity: 'mythic', a: '#5fffc4', b: '#0d1430', bands: [['#0d1430', 3.1], ['#2a3f8a', 2.1], ['#5fffc4', 1.1], ['#ffffff', 0.4]], spark: 'flake', sparkA: '#ffffff', sparkB: '#5fffc4' },
];
// the Four Seasons trail spins these off in turn: [shape, colour, other colour]
const SEASON_SPARKS = [['flake', '#ffffff', '#bfe3ff'], ['petal', '#ffc8dd', '#ff9ac4'], ['ember', '#ffd166', '#ff9a1f'], ['leaf', '#e8742a', '#c2300a']];

// how many samples of ball path each trail keeps (the shop trails are the long ones)
const TRAIL_LEN = { pass: 7, weak: 8, shot: 10, strong: 14 };
for (const t of TRAILS) TRAIL_LEN[t.id] = 18;

// ===== Small math helpers ===========================================
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const easeOut = (t) => 1 - (1 - t) * (1 - t) * (1 - t);
// Lighten (amt > 0) or darken (amt < 0) a #rrggbb color — flat highlight/shade tones.
function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ===== Arena walls ==================================================
// One closed polygon (boards + goal pockets) plus two stubs that close the
// gap between each post and the end boards. Circle-vs-segment collision.
const WALLS = [];
const POSTS = [];
const ARENA_POLY = [];
function buildWalls() {
  // the fence round the court: a rectangle with its corners cut, no pockets (there are no goals)
  WALLS.length = 0; POSTS.length = 0; ARENA_POLY.length = 0;
  const W = CFG.FIELD_W, H = CFG.FIELD_H, M = CFG.SIDE_M, E = CFG.END_M, C = CFG.CHAMFER;
  const pts = [
    [-E + C, -M], [W + E - C, -M], [W + E, -M + C], [W + E, H + M - C],
    [W + E - C, H + M], [-E + C, H + M], [-E, H + M - C], [-E, -M + C],
  ];
  const add = (ax, ay, bx, by, kind, side) => {
    const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy);
    WALLS.push({ ax, ay, bx, by, dx, dy, len2: l * l, nx: -dy / l, ny: dx / l, kind, side });
  };
  ARENA_POLY.push(...pts);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    add(a[0], a[1], b[0], b[1], 'board', a[0] > W / 2 ? 'right' : 'left');
  }
}
buildWalls();

// Two courts. 'normal' is every match: a street court in a cage, nothing goes out. 'pro' is PRO
// MATCH: the same court with the fence further back, because there the lines are out of bounds
// and the game restarts from the side (js/rules.js), and there is room to stand out there.
const PITCHES = {
  normal: { FIELD_W: 1800, FIELD_H: 1000, SIDE_M: 52, END_M: 74, CHAMFER: 40 },
  pro:    { FIELD_W: 1800, FIELD_H: 1000, SIDE_M: 120, END_M: 140, CHAMFER: 30 },
};
const Pitch = {
  size: 'normal',
  // switch the whole world to that pitch (and the walls, goals and painted field with it)
  use(size) {
    const want = PITCHES[size] ? size : 'normal';
    if (want === this.size) return false;
    this.size = want;
    Object.assign(CFG, PITCHES[want]);
    GOAL_Y1 = (CFG.FIELD_H - CFG.BOARD_W) / 2;
    GOAL_Y2 = GOAL_Y1 + CFG.BOARD_W;
    buildWalls();
    if (typeof Render !== 'undefined' && Render.ctx) { Render.camOut = 0; Render._miniBox = null; Render.cam.x = CFG.FIELD_W / 2; Render.cam.y = (CFG.FIELD_H / 2) * CFG.TILT; Render.buildLayer(); Render.homeCrowd = null; }
    return true;
  },
};

// point-in-polygon (ray cast) against the arena outline, goal pockets included
function insideArena(x, y) {
  let inside = false;
  for (let i = 0, j = ARENA_POLY.length - 1; i < ARENA_POLY.length; j = i++) {
    const [xi, yi] = ARENA_POLY[i], [xj, yj] = ARENA_POLY[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const WALL_HIT = { hit: 0, net: null, post: false };
function collideWalls(o, r, bounce) {
  WALL_HIT.hit = 0; WALL_HIT.net = null; WALL_HIT.post = false;
  for (let i = 0; i < WALLS.length; i++) {
    const s = WALLS[i];
    let t = ((o.x - s.ax) * s.dx + (o.y - s.ay) * s.dy) / s.len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = s.ax + s.dx * t, cy = s.ay + s.dy * t;
    const dx = o.x - cx, dy = o.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    let d = Math.sqrt(d2), nx, ny;
    if (d < 1e-4) { nx = s.nx; ny = s.ny; d = 0; } else { nx = dx / d; ny = dy / d; }
    o.x += nx * (r - d);
    o.y += ny * (r - d);
    const vn = o.vx * nx + o.vy * ny;
    if (vn < 0) {
      o.vx -= (1 + bounce) * vn * nx;
      o.vy -= (1 + bounce) * vn * ny;
      if (-vn > WALL_HIT.hit) WALL_HIT.hit = -vn;
      if (s.kind === 'net') WALL_HIT.net = s.side;
    }
  }
  for (let i = 0; i < POSTS.length; i++) {
    if (Math.abs(o.x - POSTS[i].x) < r + 4 && Math.abs(o.y - POSTS[i].y) < r + 4) WALL_HIT.post = true;
  }
  return WALL_HIT;
}
