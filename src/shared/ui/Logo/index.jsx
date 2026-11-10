import logo from '../../../assets/logoHuy.jpg';
import { clsx } from '../../lib/format';

/**
 * The logo: a black hexagon with an H, on white. It is a picture with its own white ground, so it reads the same on the dark and the
 * light theme; `className` sets the size and the corners (e.g. "size-9 rounded-lg").
 */
export default function Logo({ className }) {
  return <img src={logo} alt="" width="64" height="64" draggable={false} className={clsx('shrink-0 bg-white object-cover select-none', className)} data-logo />;
}
