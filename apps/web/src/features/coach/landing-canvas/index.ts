/**
 * Coach Landing Canvas — Public API barrel.
 *
 * External consumers import from this barrel only. No deep-path imports
 * from outside the feature.
 */
export { CoachLandingCanvas } from './components/CoachLandingCanvas';
export { useLandingCanvas } from './hooks/useLandingCanvas';
export type {
  CoachLandingBlock,
  CoachLandingDocument,
  CoachLandingListItem,
  CanvasConfig,
  ImageAsset,
  BlockType,
  BaseBlock,
  BlockStyle,
  HeroBlockProps,
  HeadingBlockProps,
  TextBlockProps,
  ImageBlockProps,
  ButtonBlockProps,
  DividerBlockProps,
  SocialLinksBlockProps,
  ContactBlockProps,
  SocialLink,
} from './types';
export {
  getCoachLandings,
  createCoachLanding,
  updateCoachLanding,
  publishCoachLanding,
  deleteCoachLanding,
  getPublicCoachLanding,
  uploadLandingMedia,
  getCoachLandingList,
  type CreateCoachLandingInput,
  type UpdateCoachLandingInput,
  type PublishCoachLandingInput,
} from './api/coachLanding';
