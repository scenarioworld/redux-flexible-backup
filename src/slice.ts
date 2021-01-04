import { createSlice, CreateSliceOptions, Slice, SliceCaseReducers } from "@reduxjs/toolkit";
import { BackupSaveFunction, BackupLoadFunction, SliceBackupInterface } from './backup';

interface SliceAddon<Slice>
{
    /**
     * Creates a new backup interface for this slice. @see createBackup
     * @param save Save method to conver this slice into a storage object
     * @param load Load method to recover the slice state from a storage object (created by save)
     */
    createBackupInterface<Stored>(save: BackupSaveFunction<Slice, Stored>, load: BackupLoadFunction<Slice, Stored>): SliceBackupInterface<Slice, Stored>;
}

/**
 * Creates a slice definition via redux toolkit with an addon function to create backup interfaces
 * @param options Slice definition options for redux toolkit. @see createSlice
 */
export function createBackupSlice<State, CaseReducers extends SliceCaseReducers<State>, Name extends string = string>
    (options: CreateSliceOptions<State, CaseReducers, Name>): Slice<State, CaseReducers, Name> & SliceAddon<State>
{
    return {
        ...createSlice(options), 
        createBackupInterface: 
        <Stored>(save: BackupSaveFunction<State, Stored>, load: BackupLoadFunction<State, Stored>) => ({ save, load })
    };
}