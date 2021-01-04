import { SliceBackupInterface } from './backup';

/** A simple slice backup interface that shallow copies the state to and from backup */
export const CopySliceBackupInterface: SliceBackupInterface<any, any> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  save: (state: any) => state,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  load: (state: any) => state,
};
