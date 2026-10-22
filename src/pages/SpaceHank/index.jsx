import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, PerspectiveCamera, RoundedBox, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import './spacehank.css';

const tabs = [
  { id: 'space', label: 'SpaceWorkAI', icon: '⌘' }, { id: 'rag', label: 'RAG', icon: '⌁' },
  { id: 'docs', label: 'Document', icon: '▤' }, { id: 'memory', label: 'Memory', icon: '◉' },
];
const seedAgents = [
  { id: 'codex', name: 'Minh Codex', role: 'Lead engineer', model: 'GPT-5', color: '#62e7d3', status: 'coding', task: 'Refactor auth middleware', room: 'ENGINEERING', route: [[-10.3, 0, -4.2], [-6.3, 0, -4.2], [-6.3, 0, -1.75], [-10.3, 0, -1.75]] },
  { id: 'claude', name: 'An Claude', role: 'Research analyst', model: 'Claude Sonnet 4', color: '#c9a5ff', status: 'researching', task: 'Summarise RAG sources', room: 'RESEARCH', route: [[6.3, 0, -4.2], [10.3, 0, -4.2], [10.3, 0, -1.75], [6.3, 0, -1.75]] },
  { id: 'nova', name: 'Linh Nova', role: 'Document builder', model: 'GPT-4.1', color: '#ffb76b', status: 'reviewing', task: 'Review API contracts', room: 'DOCUMENTS', route: [[-8.8, 0, 5.6], [-5.2, 0, 5.6], [-5.2, 0, 7.8], [-8.8, 0, 7.8]] },
  { id: 'pixel', name: 'Khoa Pixel', role: 'UI systems', model: 'Claude Sonnet 4', color: '#ff7e9e', status: 'meeting', task: 'Design system review', room: 'DESIGN', route: [[4.3, 0, 5.6], [8.8, 0, 5.6], [8.8, 0, 7.8], [4.3, 0, 7.8]] },
  { id: 'atlas', name: 'Huy Atlas', role: 'QA architect', model: 'GPT-5 mini', color: '#7ab8ff', status: 'testing', task: 'Run regression matrix', room: 'QUALITY', route: [[-8.8, 0, 10.3], [-5.2, 0, 10.3], [-5.2, 0, 12.3], [-8.8, 0, 12.3]] },
  { id: 'rhea', name: 'Mai Rhea', role: 'ML operator', model: 'Claude Opus 4', color: '#f48dca', status: 'training', task: 'Tune retrieval pipeline', room: 'ML LAB', route: [[4.3, 0, 10.3], [8.8, 0, 10.3], [8.8, 0, 12.3], [4.3, 0, 12.3]] },
  { id: 'gemini', name: 'Vy Gemini', role: 'Data researcher', model: 'Gemini 2.5 Pro', color: '#6da8ff', status: 'analysing', task: 'Compare multimodal sources', room: 'RESEARCH', route: [[10.3, 0, -4.2], [6.3, 0, -4.2], [6.3, 0, -1.75], [10.3, 0, -1.75]] },
  { id: 'grok', name: 'Son Grok', role: 'Realtime scout', model: 'Grok 4', color: '#f5f5f5', status: 'scanning', task: 'Monitor live signals', room: 'RESEARCH', route: [[6.3, 0, -1.75], [10.3, 0, -1.75], [10.3, 0, -4.2], [6.3, 0, -4.2]] },
  { id: 'deepseek', name: 'Ha DeepSeek', role: 'Code specialist', model: 'DeepSeek V3', color: '#4aa5ff', status: 'coding', task: 'Optimise inference code', room: 'ENGINEERING', route: [[-6.3, 0, -1.75], [-10.3, 0, -1.75], [-10.3, 0, -4.2], [-6.3, 0, -4.2]] },
  { id: 'qwen', name: 'Thu Qwen', role: 'Knowledge curator', model: 'Qwen 3 Max', color: '#ffc765', status: 'curating', task: 'Index company memory', room: 'DOCUMENTS', route: [[-5.8, 0, 5.3], [-3.8, 0, 5.3], [-3.8, 0, 7.5], [-5.8, 0, 7.5]] },
  { id: 'mira', name: 'Mira Core', role: 'Infrastructure operator', model: 'SpaceHank Control AI', color: '#62e7d3', status: 'monitoring', task: 'Monitor central server room', room: 'CONTROL', route: [[-1.35, 0, .35], [1.35, 0, .35], [1.35, 0, 3.35], [-1.35, 0, 3.35]] },
];

function Room({ position, size, title, color = '#20313e', number }) {
  const doorWidth = 1.55; const wallHeight = 1.45; const wallY = wallHeight / 2; const segmentWidth = (size[0] - doorWidth) / 2; const wall = '#263640';
  const wallMaterial = <meshStandardMaterial color={wall} transparent opacity={.42} roughness={.72} />;
  return <group position={position}>
    <mesh position={[0, .025, 0]}><boxGeometry args={[size[0], .05, size[1]]} /><meshStandardMaterial color="#13222c" roughness={.8} /></mesh>
    <mesh position={[0, wallY, -size[1] / 2]}><boxGeometry args={[size[0], wallHeight, .12]} />{wallMaterial}</mesh>
    <mesh position={[-size[0] / 2, wallY, 0]}><boxGeometry args={[.12, wallHeight, size[1]]} />{wallMaterial}</mesh>
    <mesh position={[size[0] / 2, wallY, 0]}><boxGeometry args={[.12, wallHeight, size[1]]} />{wallMaterial}</mesh>
    <mesh position={[-(size[0] + doorWidth) / 4, wallY, size[1] / 2]}><boxGeometry args={[segmentWidth, wallHeight, .12]} />{wallMaterial}</mesh>
    <mesh position={[(size[0] + doorWidth) / 4, wallY, size[1] / 2]}><boxGeometry args={[segmentWidth, wallHeight, .12]} />{wallMaterial}</mesh>
    <mesh position={[0, wallHeight, size[1] / 2]}><boxGeometry args={[doorWidth, .08, .12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} /></mesh>
    {[-size[0] / 2, size[0] / 2, -doorWidth / 2, doorWidth / 2].map((x) => <group key={x}><mesh position={[x, wallY, x === -doorWidth / 2 || x === doorWidth / 2 ? size[1] / 2 : 0]}><boxGeometry args={[.08, wallHeight, .08]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.7} /></mesh></group>)}
    <Text position={[-size[0] / 2 + .18, wallHeight - .12, -size[1] / 2 + .05]} fontSize={.14} color="#d4faf4" anchorX="left">{title}</Text><Text position={[size[0] / 2 - .2, wallHeight - .12, -size[1] / 2 + .05]} fontSize={.1} color={color} anchorX="right">{number}</Text><Text position={[0, .58, size[1] / 2 + .05]} rotation={[0, Math.PI, 0]} fontSize={.08} color="#8fb8b5" anchorX="center">DOOR / OPEN</Text>
  </group>;
}

function OfficeAsset({ file, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  const { scene } = useGLTF(`/models/office/${file}`);
  const model = useMemo(() => { const clone = scene.clone(true); clone.traverse((node) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } }); return clone; }, [scene]);
  return <primitive object={model} position={position} rotation={rotation} scale={scale} />;
}

function WorkScreen({ position, color = '#62e7d3' }) {
  const pulse = useRef(null);
  useFrame(({ clock }) => {
    if (pulse.current) pulse.current.scale.x = .72 + Math.sin(clock.elapsedTime * 2.4 + position[0]) * .12;
  });
  return <group position={position}>
    <mesh rotation={[-.06, 0, 0]}><planeGeometry args={[.42, .28]} /><meshBasicMaterial color="#071116" /></mesh>
    <mesh ref={pulse} position={[0, -.07, .006]} rotation={[-.06, 0, 0]}><planeGeometry args={[.3, .018]} /><meshBasicMaterial color={color} /></mesh>
    <mesh position={[0, -.015, .006]} rotation={[-.06, 0, 0]}><planeGeometry args={[.22, .014]} /><meshBasicMaterial color="#397482" /></mesh>
    <mesh position={[0, .04, .006]} rotation={[-.06, 0, 0]}><planeGeometry args={[.34, .012]} /><meshBasicMaterial color="#234b59" /></mesh>
    <pointLight color={color} intensity={.18} distance={1.2} />
  </group>;
}

function Desk({ position, color = '#27424d' }) {
  return <group position={position}><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .015, 0]}><circleGeometry args={[.95, 32]} /><meshBasicMaterial color={color} transparent opacity={.1} /></mesh><OfficeAsset file="desk.glb" position={[.36, 0, 0]} scale={1.35} /><OfficeAsset file="vector-office-chair.glb" position={[0, 0, .78]} rotation={[0, Math.PI, 0]} scale={.72} /><OfficeAsset file="monitor.glb" position={[-.24, .64, .14]} rotation={[0, .035, 0]} scale={.55} /><OfficeAsset file="monitor.glb" position={[.24, .64, .14]} rotation={[0, -.035, 0]} scale={.55} /><WorkScreen position={[-.24, .75, .26]} color="#62e7d3" /><WorkScreen position={[.24, .75, .26]} color="#c9a5ff" /><OfficeAsset file="desk_lamp.glb" position={[-.42, .66, .36]} rotation={[0, Math.PI, 0]} scale={.52} /><pointLight position={[-.42, 1.02, .36]} color="#ffd28a" intensity={.46} distance={2.1} /></group>;
}

function ServerRack({ position, accent = '#62e7d3' }) {
  return <group position={position}><RoundedBox args={[.92, 2.5, .68]} radius={.06}><meshStandardMaterial color="#101b24" metalness={.6} roughness={.4} /></RoundedBox><mesh position={[0, 1.29, 0]}><boxGeometry args={[.72, .04, .54]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} /></mesh>{[-.85, -.48, -.11, .26, .63, 1].map((y) => <group key={y}><mesh position={[0, y, .36]}><boxGeometry args={[.68, .22, .025]} /><meshStandardMaterial color="#091118" /></mesh><mesh position={[-.25, y, .39]}><sphereGeometry args={[.035, 8, 8]} /><meshBasicMaterial color={accent} /></mesh><mesh position={[-.15, y, .39]}><sphereGeometry args={[.035, 8, 8]} /><meshBasicMaterial color="#ffb76b" /></mesh><mesh position={[.18, y, .39]}><boxGeometry args={[.22, .025, .01]} /><meshBasicMaterial color="#335461" /></mesh></group>)}</group>;
}

function ServerRoom({ position = [0, 0, 2.2] }) {
  const racks = [-3.05, -1.83, -.61, .61, 1.83, 3.05];
  return <group position={position}>
    <mesh position={[0, .025, 0]}><boxGeometry args={[8.4, .05, 7.2]} /><meshStandardMaterial color="#10232c" roughness={.8} /></mesh>
    <mesh position={[0, 1.2, -3.6]}><boxGeometry args={[8.4, 2.4, .1]} /><meshStandardMaterial color="#234651" transparent opacity={.3} roughness={.7} /></mesh>
    <mesh position={[-4.2, 1.2, 0]}><boxGeometry args={[.1, 2.4, 7.2]} /><meshStandardMaterial color="#234651" transparent opacity={.3} roughness={.7} /></mesh>
    <mesh position={[4.2, 1.2, 0]}><boxGeometry args={[.1, 2.4, 7.2]} /><meshStandardMaterial color="#234651" transparent opacity={.3} roughness={.7} /></mesh>
    {racks.map((x, index) => <group key={x}><ServerRack position={[x, 0, -.75]} accent={index % 2 ? '#c9a5ff' : '#62e7d3'} /><ServerRack position={[x, 0, .75]} accent={index % 2 ? '#ffb76b' : '#62e7d3'} /></group>)}
    <Text position={[-3.95, 2.05, -3.52]} fontSize={.18} color="#d4faf4" anchorX="left">CONTROL / SERVER ROOM</Text>
    <Text position={[-3.95, 1.78, -3.52]} fontSize={.1} color="#6eafb0" anchorX="left">24 NODES · LIVE INFERENCE · 24/7</Text>
    <pointLight position={[0, 2, 0]} color="#62e7d3" intensity={2.5} distance={7} />
  </group>;
}

function Character({ agent, selected, onSelect, paused, talking, talkMessage }) {
  const ref = useRef(); const avatar = useRef(); const leftArm = useRef(); const rightArm = useRef(); const index = useRef(Math.floor(Math.random() * agent.route.length)); const workTime = useRef(agent.room === 'ENGINEERING' || agent.room === 'RESEARCH' ? 5 + Math.random() * 4 : 0); const phase = useRef(Math.random() * 5);
  useFrame((_, delta) => {
    const working = workTime.current > 0;
    if (!paused && !talking && working) workTime.current -= delta;
    if (avatar.current) {
      const t = _.clock.elapsedTime * 8 + phase.current;
      const typing = working ? Math.sin(t) * .06 : 0;
      avatar.current.position.y = working ? .5 : .72;
      if (leftArm.current) leftArm.current.rotation.z = working ? -.9 + typing : -.5;
      if (rightArm.current) rightArm.current.rotation.z = working ? .9 - typing : .5;
    }
    if (paused || talking || working) return;
    const target = agent.route[index.current]; const next = new THREE.Vector3(...target); const current = ref.current.position;
    const distance = current.distanceTo(next);
    if (distance < .08) { if (index.current === 0) workTime.current = 2.8; index.current = (index.current + 1) % agent.route.length; }
    else { const step = Math.min(distance, delta * .85); current.lerp(next, step / Math.max(distance, .001)); ref.current.rotation.y = Math.atan2(next.x - current.x, next.z - current.z); }
  });
  return <group ref={ref} position={agent.route[0]} onClick={(e) => { e.stopPropagation(); onSelect(agent.id); }}>
    <group ref={avatar}><mesh position={[0, .32, 0]}><sphereGeometry args={[.24, 24, 18]} /><meshStandardMaterial color="#d8a98f" roughness={.45} /></mesh><mesh position={[0, .53, -.04]}><sphereGeometry args={[.255, 24, 12, 0, Math.PI * 2, 0, .92]} /><meshStandardMaterial color={agent.color} roughness={.65} /></mesh><mesh position={[-.09, .35, .205]}><sphereGeometry args={[.025, 10, 10]} /><meshStandardMaterial color="#15202a" /></mesh><mesh position={[.09, .35, .205]}><sphereGeometry args={[.025, 10, 10]} /><meshStandardMaterial color="#15202a" /></mesh><mesh position={[0, .2, .22]}><capsuleGeometry args={[.04, .1, 4, 8]} /><meshStandardMaterial color="#e0aa8c" /></mesh><mesh position={[0, .03, 0]}><capsuleGeometry args={[.22, .58, 6, 12]} /><meshStandardMaterial color="#f3f4f0" /></mesh><mesh position={[0, .1, -.23]}><boxGeometry args={[.22, .3, .025]} /><meshStandardMaterial color={agent.color} /></mesh><mesh position={[0, .02, -.245]}><boxGeometry args={[.035, .25, .02]} /><meshStandardMaterial color="#d9f3ed" /></mesh><mesh position={[0, -.13, -.265]}><boxGeometry args={[.1, .065, .02]} /><meshStandardMaterial color="#f5c86e" emissive="#f5c86e" emissiveIntensity={.6} /></mesh><mesh position={[-.14, -.45, 0]}><capsuleGeometry args={[.06, .34, 4, 8]} /><meshStandardMaterial color="#243746" /></mesh><mesh position={[.14, -.45, 0]}><capsuleGeometry args={[.06, .34, 4, 8]} /><meshStandardMaterial color="#243746" /></mesh><mesh position={[-.14, -.67, .02]}><boxGeometry args={[.13, .07, .25]} /><meshStandardMaterial color="#101b24" /></mesh><mesh position={[.14, -.67, .02]}><boxGeometry args={[.13, .07, .25]} /><meshStandardMaterial color="#101b24" /></mesh><mesh ref={leftArm} position={[-.3, .04, 0]} rotation={[0, 0, -.5]}><capsuleGeometry args={[.045, .32, 4, 8]} /><meshStandardMaterial color="#f3f4f0" /></mesh><mesh ref={rightArm} position={[.3, .04, 0]} rotation={[0, 0, .5]}><capsuleGeometry args={[.045, .32, 4, 8]} /><meshStandardMaterial color="#f3f4f0" /></mesh><mesh position={[-.37, -.14, 0]}><sphereGeometry args={[.07, 10, 10]} /><meshStandardMaterial color="#d8a98f" /></mesh><mesh position={[.37, -.14, 0]}><sphereGeometry args={[.07, 10, 10]} /><meshStandardMaterial color="#d8a98f" /></mesh></group>
    {selected && <pointLight color={agent.color} intensity={2} distance={2.2} position={[0, 1, 0]} />}<Html position={[0, 2, 0]} center distanceFactor={9}><div className="world-agent-stack">{talking && <div className="world-chat" style={{ '--agent-color': agent.color }}><span>✦</span>{talkMessage}</div>}<button className={`world-label ${selected ? 'chosen' : ''} ${talking ? 'speaking' : ''}`} style={{ '--agent-color': agent.color }} onClick={(e) => { e.stopPropagation(); onSelect(agent.id); }}><span className="employee-line"><i className="employee-dot" /><b>{agent.name}</b></span><small>{agent.role} · {talking ? 'speaking' : agent.status}</small></button></div></Html>
  </group>;
}

function World({ agents, selected, onSelect, paused }) {
  const [conversation, setConversation] = useState(null);
  useEffect(() => { if (paused) { setConversation(null); return undefined; } const messages = ['Mình vừa tìm thấy một context liên quan.', 'Bạn review giúp mình phần này nhé.', 'Đã sync xong với phòng Core.', 'Mình chuyển task này cho bạn.']; let hide; const timer = window.setInterval(() => { const first = Math.floor(Math.random() * agents.length); let second = Math.floor(Math.random() * agents.length); while (second === first) second = Math.floor(Math.random() * agents.length); setConversation({ ids: [agents[first].id, agents[second].id], message: messages[Math.floor(Math.random() * messages.length)] }); hide = window.setTimeout(() => setConversation(null), 4200); }, 7800); return () => { window.clearInterval(timer); window.clearTimeout(hide); }; }, [paused, agents]);
  return <Canvas shadows dpr={[1, 1.8]} className="webgl-world" onPointerMissed={() => onSelect(null)}><PerspectiveCamera makeDefault position={[14, 16, 19]} fov={42} /><color attach="background" args={['#091118']} /><ambientLight intensity={1.4} /><directionalLight castShadow position={[4, 10, 5]} intensity={3} color="#c9e9e4" shadow-mapSize={[1024, 1024]} /><pointLight position={[0, 4, 0]} intensity={7} distance={15} color="#2fd8ca" />
    <group rotation={[0, -.25, 0]}><mesh receiveShadow position={[0, -.02, 4.5]}><boxGeometry args={[28, .04, 25]} /><meshStandardMaterial color="#152b35" roughness={.8} /></mesh><gridHelper args={[30, 30, '#2f6870', '#1c414b']} position={[0, .015, 4.5]} /><Room position={[-8.3, 0, -3]} size={[7.6, 4.2]} title="ENGINEERING / CORE" number="01" /><Room position={[8.3, 0, -3]} size={[7.6, 4.2]} title="RESEARCH / RAG" color="#2b2440" number="02" /><Room position={[-8.3, 0, 6.8]} size={[7.6, 4]} title="DOCUMENTS / OPS" color="#3b2d1e" number="03" /><Room position={[8.3, 0, 6.8]} size={[7.6, 4]} title="DESIGN / STUDIO" color="#3e2531" number="04" /><Room position={[-8.3, 0, 11.6]} size={[7.6, 4]} title="QUALITY / QA" color="#233a55" number="05" /><Room position={[8.3, 0, 11.6]} size={[7.6, 4]} title="ML LAB / TRAINING" color="#432743" number="06" />
      <Desk position={[-10.3, 0, -4.2]} /><Desk position={[-6.3, 0, -4.2]} color="#274e53" /><Desk position={[-10.3, 0, -1.75]} color="#274e53" /><Desk position={[-6.3, 0, -1.75]} color="#274e53" /><Desk position={[6.3, 0, -4.2]} color="#30294b" /><Desk position={[10.3, 0, -4.2]} color="#30294b" /><Desk position={[6.3, 0, -1.75]} color="#30294b" /><Desk position={[10.3, 0, -1.75]} color="#30294b" /><Desk position={[-10.3, 0, 5.7]} color="#4e3a29" /><Desk position={[-6.3, 0, 5.7]} color="#4e3a29" /><Desk position={[-10.3, 0, 7.9]} color="#4e3a29" /><Desk position={[-6.3, 0, 7.9]} color="#4e3a29" /><Desk position={[6.3, 0, 5.7]} color="#4b2939" /><Desk position={[10.3, 0, 5.7]} color="#4b2939" /><Desk position={[6.3, 0, 7.9]} color="#4b2939" /><Desk position={[10.3, 0, 7.9]} color="#4b2939" />
      <ServerRoom position={[0, 0, 1.9]} /><RoundedBox args={[2.8, .16, 1.45]} radius={.12} position={[0, .18, 14.6]}><meshStandardMaterial color="#27515a" emissive="#1e7472" emissiveIntensity={.15} /></RoundedBox><Text position={[-1, .3, 14.6]} rotation={[-Math.PI / 2, 0, 0]} fontSize={.18} color="#9be9df">AGENT SYNC / MEETING ROOM</Text>
      {agents.map((agent) => <Character key={agent.id} agent={agent} selected={selected === agent.id} onSelect={onSelect} paused={paused} talking={conversation?.ids.includes(agent.id)} talkMessage={conversation?.message} />)}
      <Desk position={[-10.3, 0, 10.5]} color="#29425b" /><Desk position={[-6.3, 0, 10.5]} color="#29425b" /><Desk position={[6.3, 0, 10.5]} color="#4b2d49" /><Desk position={[10.3, 0, 10.5]} color="#4b2d49" /><Desk position={[-10.3, 0, 12.7]} color="#29425b" /><Desk position={[-6.3, 0, 12.7]} color="#29425b" /><Desk position={[6.3, 0, 12.7]} color="#4b2d49" /><Desk position={[10.3, 0, 12.7]} color="#4b2d49" />
    </group><OrbitControls enablePan enableDamping dampingFactor={.08} minDistance={8} maxDistance={36} maxPolarAngle={Math.PI / 2.15} target={[0, 0, 4]} /></Canvas>;
}

function LoginScreen({ password, setPassword, onSubmit, loading, error }) {
  return <div className="space-auth"><div className="auth-glow" /><form className="auth-card" onSubmit={onSubmit}><div className="auth-mark">✦</div><div className="auth-kicker">PRIVATE WORKSPACE / 01</div><h1>Welcome back.</h1><p>This space is reserved for the people running the company.</p><label htmlFor="space-password">Access key</label><input id="space-password" type="password" autoFocus autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your workspace password" /><button type="submit" disabled={loading || !password}>{loading ? 'Checking access…' : 'Enter SpaceHank ↗'}</button>{error && <div className="auth-error">{error}</div>}<small className="auth-note">Session protected · 12 hour expiry</small></form></div>;
}

const SpaceHank = () => {
  const [authenticated, setAuthenticated] = useState(null); const [password, setPassword] = useState(''); const [authError, setAuthError] = useState(''); const [authLoading, setAuthLoading] = useState(false); const [tab, setTab] = useState('space'); const [selected, setSelected] = useState('codex'); const [paused, setPaused] = useState(false); const [agents, setAgents] = useState(seedAgents); const [toast, setToast] = useState(''); const [connected, setConnected] = useState(false); const socketRef = useRef(null); const [events, setEvents] = useState([{ name: 'Codex', action: 'coding', text: 'Working in Engineering / Core', time: 'just now', color: '#62e7d3' }, { name: 'Claude', action: 'researching', text: 'Cross-checking 12 RAG chunks', time: '2 min ago', color: '#c9a5ff' }, { name: 'Nova', action: 'reviewing', text: 'Left 3 comments on api.md', time: '4 min ago', color: '#ffb76b' }]);
  const activeAgent = agents.find((a) => a.id === selected) || agents[0];
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2400); };
  const apiUrl = import.meta.env.VITE_SPACEHANK_API_URL || 'http://localhost:8787';
  useEffect(() => { fetch(`${apiUrl}/api/auth/session`, { credentials: 'include' }).then((response) => response.json()).then((data) => setAuthenticated(Boolean(data.authenticated))).catch(() => setAuthenticated(false)); }, [apiUrl]);
  const login = async (event) => { event.preventDefault(); setAuthLoading(true); setAuthError(''); try { const response = await fetch(`${apiUrl}/api/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }); if (!response.ok) throw new Error('Wrong access key.'); setAuthenticated(true); setPassword(''); } catch (error) { setAuthError(error.message === 'Failed to fetch' ? 'Realtime server is offline. Start npm run spacehank:server first.' : error.message); } finally { setAuthLoading(false); } };
  const logout = async () => { await fetch(`${apiUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {}); setAuthenticated(false); setConnected(false); };
  useEffect(() => {
    if (authenticated !== true) return undefined;
    const url = import.meta.env.VITE_SPACEHANK_WS_URL || 'ws://localhost:8787';
    let socket;
    try {
      socket = new WebSocket(url); socketRef.current = socket;
      socket.onopen = () => { setConnected(true); notify('Connected to realtime company server'); };
      socket.onclose = () => { setConnected(false); socketRef.current = null; };
      socket.onerror = () => setConnected(false);
      socket.onmessage = ({ data }) => { try { const message = JSON.parse(data); if (message.agents) setAgents((old) => old.map((local) => ({ ...local, ...(message.agents.find((remote) => remote.id === local.id) || {}) }))); if (message.event) { const remote = seedAgents.find((a) => a.id === message.event.agent) || seedAgents[0]; setEvents((old) => [{ name: remote.name, action: message.event.action, text: message.event.text, time: 'just now', color: remote.color }, ...old].slice(0, 5)); } } catch { /* keep UI alive if a stale worker sends malformed data */ } };
    } catch { setConnected(false); }
    return () => socket?.close();
  }, [authenticated]);
  useEffect(() => { const id = window.setInterval(() => { if (paused || connected) return; const agent = seedAgents[Math.floor(Math.random() * seedAgents.length)]; setEvents((old) => [{ name: agent.name, action: 'syncing', text: `Moving through ${agent.room}`, time: 'just now', color: agent.color }, ...old].slice(0, 5)); }, 4200); return () => window.clearInterval(id); }, [paused, connected]);
  const dispatch = () => { const task = window.prompt('Giao nhiệm vụ cho đội AI:', 'Audit the latest API changes'); if (!task) return; if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ type: 'task', title: task, prompt: task, agentId: 'codex' })); setAgents((old) => old.map((a) => a.id === 'codex' ? { ...a, status: 'executing', task } : a)); setSelected('codex'); notify(connected ? 'Task sent to realtime worker' : 'Task dispatched to local demo'); };
  if (authenticated === null) return <div className="space-auth auth-loading"><div className="auth-spinner" /><span>Securing workspace…</span></div>;
  if (!authenticated) return <LoginScreen password={password} setPassword={setPassword} onSubmit={login} loading={authLoading} error={authError} />;
  return <div className="space-shell">
    <aside className="space-sidebar"><div className="brand"><span className="brand-mark">✦</span><span>space<span>hank</span></span></div><div className="workspace-switch"><span className="workspace-dot" /> My workspace <span className="chevron">⌄</span></div><nav className="space-nav">{tabs.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}{item.id === 'rag' && <em>3</em>}</button>)}</nav><div className="sidebar-bottom"><button onClick={() => setPaused((v) => !v)}><span>{paused ? '▶' : 'Ⅱ'}</span>{paused ? 'Resume simulation' : 'Pause simulation'}</button><button onClick={logout}><span>⌑</span> Lock workspace</button><Link to="/"><span>↗</span> Back to portfolio</Link><div className="profile"><span className="profile-avatar">VH</span><span><b>Võ Gia Huy</b><small>Personal space</small></span><span className="dots">•••</span></div></div></aside>
    <main className="space-main"><header className="space-header"><div><div className="breadcrumb">MY WORKSPACE <span>/</span> {tabs.find((t) => t.id === tab)?.label.toUpperCase()}</div><h1>{tab === 'space' ? 'The Agent Floor' : tabs.find((t) => t.id === tab)?.label}</h1><p>{tab === 'space' ? 'A living 3D company. Agents move, collaborate and execute work.' : 'A focused view for your personal knowledge workflow.'}</p></div><div className="header-actions"><span className="live-dot" style={{ background: connected ? '#62e7d3' : '#ffb76b' }} /> <span className="live-text">{paused ? 'PAUSED' : connected ? 'CONNECTED' : 'LOCAL DEMO'} <small>24/7 LOOP</small></span><button className="icon-btn" onClick={() => notify(connected ? 'All agents are connected' : 'Start npm run spacehank:server for realtime mode')}>♢</button><button className="new-task" onClick={dispatch}>＋ New task</button></div></header>
      {tab === 'space' ? <><section className="stats-row"><div><span>ACTIVE AGENTS</span><strong>4 <small>/ 4</small></strong></div><div><span>TASKS IN QUEUE</span><strong>07 <small>+2</small></strong></div><div><span>LIVE EVENTS</span><strong>{events.length + 23} <small>today</small></strong></div><div className="status-summary"><span>COMPANY STATUS</span><strong><i /> Operational</strong></div></section><section className="floor-card"><div className="floor-toolbar"><div><b>3D COMPANY FLOOR</b><span>WebGL · agents moving in realtime</span></div><div className="floor-controls"><span className="camera-hint">Orbit · zoom · click an agent</span><button className="focus-btn" onClick={() => notify('Use mouse to orbit the floor')}>⌖ Controls</button></div></div><div className="floor-scene real-world"><World agents={agents} selected={selected} onSelect={setSelected} paused={paused} /><div className="scene-hud"><span className="hud-live" /> {paused ? 'SIMULATION PAUSED' : 'LIVE SIMULATION'}<small>4 agents · 4 departments · {events.length + 23} events</small></div><div className="scene-hint">Drag to orbit <span>•</span> scroll to zoom</div></div></section></> : <section className="empty-tab"><div className="empty-icon">{tabs.find((t) => t.id === tab)?.icon}</div><h2>{tabs.find((t) => t.id === tab)?.label} is connected</h2><p>This module is ready to receive your knowledge sources. The agent floor is where your team is currently working.</p><button onClick={() => setTab('space')}>Return to agent floor ↗</button></section>}
      <section className="below-grid"><div className="activity-card"><div className="card-heading"><div><span>LIVE ACTIVITY STREAM</span><h2>Company pulse</h2></div><button onClick={() => notify('Activity stream is live')}>Live ↗</button></div>{events.map((event, i) => <div className="activity-row" key={`${event.name}-${i}`}><span className="mini-avatar" style={{ '--agent-color': event.color }}>{event.name.slice(0, 1)}</span><div><b>{event.name} <small>{event.action}</small></b><p>{event.text}</p></div><time>{event.time}</time></div>)}</div><div className="selected-card"><div className="card-heading"><div><span>SELECTED EMPLOYEE</span><h2>{activeAgent.name}</h2></div><span className="online-pill"><i /> {activeAgent.status}</span></div><div className="agent-detail"><div className="detail-avatar" style={{ '--agent-color': activeAgent.color }}><span className="agent-head" /><span className="agent-body" /></div><div><b>{activeAgent.role}</b><span>{activeAgent.model} · {activeAgent.room}</span></div></div><div className="current-task"><span>CURRENT ASSIGNMENT</span><b>{activeAgent.task}</b><div className="progress"><i style={{ width: activeAgent.status === 'meeting' ? '45%' : '68%', background: activeAgent.color }} /></div></div><button className="open-agent" onClick={() => notify(`Opening ${activeAgent.name}'s context`)}>Open employee context ↗</button></div></section>
    </main>{toast && <div className="toast"><span>✓</span>{toast}</div>}</div>;
};
export default SpaceHank;
