# Storage Permission Implementation Guide

## Overview

The Coda Music Player now requests proper storage permissions from users to enable permanent offline music storage. This ensures users have full control over their downloaded music and provides a better offline experience.

## Permission System Architecture

### Platform-Specific Implementation

#### Android
- **Permission Required:** `WRITE_EXTERNAL_STORAGE`
- **Permission Dialog:** Custom modal with explanation
- **Fallback:** Settings prompt if "Never Ask Again" is selected
- **Storage Location:** Document directory (permanent storage)

#### iOS
- **Permission Required:** None (automatic for app's document directory)
- **Storage Location:** Document directory (permanent storage)
- **User Experience:** No permission prompts needed

### Permission States

```typescript
type PermissionStatus = 
  | 'granted'        // Permission has been granted
  | 'denied'         // Permission was denied (can ask again)
  | 'not-determined' // Permission not yet requested
  | 'never-ask-again'; // User selected "Never Ask Again"
```

## Key Components

### 1. DownloadPermissions Class

**Location:** `src/downloads/downloadPermissions.ts`

**Responsibilities:**
- Check current permission status
- Request storage permissions
- Manage download directory
- Check available storage space
- Validate download requirements

**Key Methods:**
```typescript
checkPermission(): Promise<PermissionStatus>
requestPermission(): Promise<PermissionStatus>
hasStoragePermission(): Promise<boolean>
getDownloadDirectory(): string
canDownload(sizeBytes: number): Promise<{canDownload: boolean, reason?: string}>
```

### 2. DownloadPermissionModal Component

**Location:** `src/components/downloads/DownloadPermissionModal.tsx`

**Features:**
- Clear explanation of why permission is needed
- Platform-specific messaging
- Allow/Cancel buttons
- Loading state during permission request
- Consistent app theming

**User Flow:**
1. User attempts to download music
2. Modal appears with permission request
3. User selects "Allow Access" or "Cancel"
4. If allowed, download proceeds
5. If denied, user is informed

### 3. DownloadStore Integration

**Location:** `src/downloads/downloadStore.ts`

**Permission Flow:**
```typescript
downloadTrack(trackId) {
  // 1. Check permission status
  const status = await downloadPermissions.checkPermission();
  
  // 2. Handle different states
  if (status === 'not-determined') {
    showPermissionModal(trackId); // Show permission modal
  } else if (status === 'never-ask-again') {
    showSettingsPrompt(); // Direct user to settings
  } else if (status === 'granted') {
    proceedWithDownload(); // Download immediately
  }
}
```

## User Experience Flow

### First Download Attempt

1. **User Action:** Taps download button on a track
2. **Permission Check:** App detects no permission status
3. **Modal Display:** Permission modal appears with explanation
4. **User Decision:** 
   - **Allow:** Permission granted, download begins
   - **Cancel:** Permission denied, download cancelled
5. **Result:** User can now download music (if allowed)

### Subsequent Downloads

1. **User Action:** Taps download button on another track
2. **Permission Check:** App checks existing permission status
3. **Immediate Action:**
   - **If Granted:** Download starts immediately
   - **If Denied:** Error message displayed
   - **If Never Ask Again:** Settings prompt shown

### "Never Ask Again" Scenario

1. **User Action:** Previously denied with "Never Ask Again"
2. **Permission Check:** Returns 'never-ask-again' status
3. **Alert Display:** 
   ```
   "Permission Required"
   "Storage permission is required to download music. 
    Please enable it in your device settings."
   ```
4. **User Options:** Cancel or Open Settings
5. **Resolution:** User manually enables permission in device settings

## Storage Management

### Download Directory

**Android:** `FileSystem.documentDirectory/downloads/`
**iOS:** `FileSystem.documentDirectory/downloads/`

**Benefits:**
- Permanent storage (not cleared by OS)
- User-accessible (with proper file managers)
- Survives app updates
- Requires user permission

### File Storage

**File Naming:** `{trackId}.{format}`
**Example:** `123456789.flac`

**Storage Format:** Base64-encoded audio files
**Quality Options:** LOSSLESS, HI_RES_LOSSLESS, HIGH, LOW

## Error Handling

### Permission Errors

1. **Permission Denied:**
   - Message: "Permission denied by user"
   - Action: Inform user, offer retry

2. **Never Ask Again:**
   - Message: "Storage permission required. Please enable it in app settings."
   - Action: Direct user to device settings

3. **Permission Check Failed:**
   - Message: "Failed to check permission status"
   - Action: Log error, assume not-determined

### Storage Errors

1. **Insufficient Space:**
   - Message: "Not enough storage space"
   - Action: Inform user, suggest freeing space

2. **Directory Creation Failed:**
   - Message: "Failed to create download directory"
   - Action: Log error, attempt download anyway

3. **File Write Failed:**
   - Message: "Failed to write download file"
   - Action: Retry with backoff, report to user

## Permission Request Dialog

### Android Native Dialog

When `PermissionsAndroid.request()` is called, Android shows:

```
┌─────────────────────────────────┐
│         Storage Permission      │
├─────────────────────────────────┤
│ Coda needs access to your      │
│ storage to download music for  │
│ offline listening.             │
│                                 │
│ [Ask Me Later] [Cancel] [OK]   │
└─────────────────────────────────┘
```

### Custom App Modal

Our custom modal provides better UX:

```
┌─────────────────────────────────┐
│      [Download Icon]           │
│                                 │
│   Storage Permission Required   │
│                                 │
│ Coda needs access to your      │
│ device storage to download     │
│ music for offline listening.   │
│                                 │
│ [ℹ] This permission allows     │
│ the app to save music files    │
│ to your device storage for     │
│ offline playback.              │
│                                 │
│   [Cancel]   [Allow Access]    │
└─────────────────────────────────┘
```

## Integration Points

### Library Screen

**Updated File:** `app/(tabs)/library.tsx`

**Changes:**
- Removed cache-based download info
- Added simple storage info banner
- Permission flow integrated into download actions

**Download Info Banner:**
```typescript
<View style={s.infoBanner}>
  <Icon name="information-circle" size={20} color={colors.primary} />
  <Text style={[t.bodySm, { color: colors.onSurfaceVariant, flex: 1 }]}>
    Downloaded music is stored in your device's storage for offline listening.
  </Text>
</View>
```

### Download Store

**Updated File:** `src/downloads/downloadStore.ts`

**Key Changes:**
- Added permission checking before download
- Integrated permission modal
- Handle "never ask again" scenario
- Alert dialogs for permission issues

## Testing Scenarios

### Test Case 1: First Download
1. Fresh app install
2. Attempt to download a track
3. Verify permission modal appears
4. Grant permission
5. Verify download starts

### Test Case 2: Permission Denied
1. Deny permission when requested
2. Attempt another download
3. Verify error message appears
4. Grant permission in settings
5. Verify download works

### Test Case 3: Never Ask Again
1. Deny permission with "Never Ask Again"
2. Attempt download
3. Verify settings prompt appears
4. Enable permission in settings
5. Verify download works

### Test Case 4: iOS (No Permission)
1. Test on iOS device
2. Attempt download
3. Verify no permission prompt
4. Verify download works immediately

## Best Practices

### 1. Clear Communication
- Explain why permission is needed
- Be specific about what will be stored
- Provide platform-appropriate messaging

### 2. Graceful Fallbacks
- Handle all permission states
- Provide clear paths to resolution
- Don't block app functionality unnecessarily

### 3. User Control
- Allow users to manage downloads
- Provide clear error messages
- Offer retry mechanisms

### 4. Privacy Considerations
- Only request permission when needed
- Store files in app-specific directory
- Don't access unrelated files

## Troubleshooting

### Common Issues

**Issue:** Permission modal doesn't appear
**Solution:** Check if permission already granted or denied

**Issue:** Downloads fail despite permission
**Solution:** Verify storage space and directory permissions

**Issue:** "Never Ask Again" can't be reset
**Solution:** User must enable in device settings

**Issue:** iOS downloads don't work
**Solution:** iOS doesn't require permission, check other issues

## Migration from Cache-Based Storage

### Previous Implementation
- Used `FileSystem.cacheDirectory`
- No permission required
- Files could be cleared by OS
- Temporary storage

### Current Implementation
- Uses `FileSystem.documentDirectory`
- Requires storage permission (Android)
- Permanent storage
- User-controlled

### Migration Benefits
- Permanent offline access
- Better user control
- Survives app updates
- More reliable storage

## Future Enhancements

### Potential Improvements

1. **Granular Permissions:**
   - Separate read/write permissions
   - Media-specific permissions

2. **Storage Management:**
   - Built-in storage cleanup
   - Storage usage analytics
   - Smart storage optimization

3. **User Preferences:**
   - Download quality settings
   - Auto-download preferences
   - Storage limits

4. **Advanced Features:**
   - External storage support
   - Cloud backup integration
   - Download scheduling

## Conclusion

The storage permission implementation provides a robust, user-friendly approach to offline music storage. By requesting proper permissions and using permanent storage, users get reliable offline access to their music while maintaining control over their device storage.

The system handles all permission states gracefully, provides clear user feedback, and ensures a smooth experience across both Android and iOS platforms.