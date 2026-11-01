import { LAYER_IDS } from './config';
import Dust from './Dust';
import Halo from './Halo';
import Packets from './Packets';
import Plate from './Plate';
import { SceneContext } from './SceneContext';
import DataLayer from './layers/DataLayer';
import DeliveryLayer from './layers/DeliveryLayer';
import InterfaceLayer from './layers/InterfaceLayer';
import ServiceLayer from './layers/ServiceLayer';

const LAYER_CONTENT = [InterfaceLayer, ServiceLayer, DataLayer, DeliveryLayer];

/**
 * The four layers, the beam with its requests, the dust and the halo of technology names, without a
 * canvas or a camera, so it can sit inside any scene: the hero, the Stack section, or the VR gallery.
 *   scene       shared state from createSceneState()
 *   showLabels  draw the DOM text labels (they do not exist inside a headset)
 */
export default function StackModel({ scene, labels, palette, mode = 'hero', techs, high = true, haloRadius = 3, haloHeight = 3.8, showLabels = true, getActive = () => -1, getBurst = () => 0, getBoost = () => 0 }) {
  return (
    <SceneContext.Provider value={scene}>
      {LAYER_IDS.map((id, i) => {
        const Content = LAYER_CONTENT[i];
        return (
          <Plate key={id} index={i} label={labels[id]} showLabel={showLabels} palette={palette} mode={mode} getFeatured={getActive}>
            <Content index={i} palette={palette} />
          </Plate>
        );
      })}
      <Packets getBurst={getBurst} />
      <Dust count={high ? 150 : 70} color={palette.ink} />
      <Halo items={techs} color={palette.ink} radius={haloRadius} height={haloHeight} getBoost={getBoost} />
    </SceneContext.Provider>
  );
}
