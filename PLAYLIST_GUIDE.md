# Local Playlist Management System

## Overview

The Luma Music Player now includes a comprehensive local playlist management system that allows users to create, store, and manage playlists entirely on their device using AsyncStorage. This system is fully functional and requires no backend services.

## Architecture

### Data Storage

**Storage Location:** AsyncStorage (Local device storage)
**Storage Key:** `luma:playlists`
**Data Format:** JSON array of Playlist objects

### Playlist Data Structure

```typescript
interface Playlist {
  id: string;                    // Unique identifier (generated)
  name: string;                  // Playlist name
  description?: string;           // Optional description
  tracks: Track[];               // Array of tracks in the playlist
  artwork?: string;              // Cover art URL
  coverUrl?: string;             // Alternative cover URL
  isPublic?: boolean;            // Privacy setting (default: false)
  tags?: string[];               // Playlist tags/categories
  color?: string;                // Theme color for UI
  icon?: string;                 // Icon identifier
  createdAt: number;            // Creation timestamp
  updatedAt: number;             // Last update timestamp
  playCount?: number;            // Play statistics
  lastPlayedAt?: number;         // Last played timestamp
}
```

## Core Features

### 1. Playlist Creation

**Component:** `CreatePlaylistModal`
**Method:** `createPlaylist(name, description, color, icon)`

**Features:**
- Custom playlist name (required)
- Optional description
- Color selection (10 preset colors)
- Icon selection (10 preset icons)
- Live preview of playlist appearance
- Form validation

**Usage:**
```typescript
const newPlaylist = await createPlaylist(
  "My Favorites",
  "Best songs ever",
  "#6366f1",
  "heart"
);
```

### 2. Playlist Management

**Component:** `PlaylistActionsModal`
**Methods:**
- `updatePlaylist(id, updates)` - Update playlist metadata
- `deletePlaylist(id)` - Remove playlist
- `duplicatePlaylist(id)` - Create a copy
- `setPlaylistCover(id, coverUrl)` - Set cover image
- `incrementPlaylistPlayCount(id)` - Track plays
- `updatePlaylistLastPlayed(id)` - Update play timestamp

**Available Actions:**
- Play Now (starts playing first track)
- Shuffle Play (if enabled)
- Edit (modify playlist details)
- Duplicate (create a copy)
- Share (export/share functionality)
- Delete (remove playlist with confirmation)

### 3. Track Management

**Component:** `AddToPlaylistModal`
**Methods:**
- `addTrackToPlaylist(playlistId, track)` - Add track to playlist
- `removeTrackFromPlaylist(playlistId, trackId)` - Remove track
- `reorderPlaylistTracks(playlistId, trackIds)` - Reorder tracks

**Features:**
- Search playlists by name
- Create new playlist from modal
- Check for duplicate tracks
- Batch operations support

**Usage:**
```typescript
// Add track to playlist
await addTrackToPlaylist(playlistId, track);

// Remove track from playlist
await removeTrackFromPlaylist(playlistId, trackId);

// Reorder tracks
await reorderPlaylistTracks(playlistId, ['track3', 'track1', 'track2']);
```

### 4. Playlist Statistics

**Available Metrics:**
- Track count
- Play count
- Last played timestamp
- Creation date
- Last update date

**Usage:**
```typescript
// Increment play count when playing
await incrementPlaylistPlayCount(playlistId);

// Update last played time
await updatePlaylistLastPlayed(playlistId);
```

## UI Components

### 1. CreatePlaylistModal

**Location:** `src/components/playlist/CreatePlaylistModal.tsx`

**Features:**
- Name input (required, max 50 chars)
- Description input (optional, max 200 chars)
- Color picker (10 preset colors)
- Icon picker (10 preset icons)
- Live preview card
- Validation and error handling

**Color Options:**
- Indigo (#6366f1)
- Violet (#8b5cf6)
- Pink (#ec4899)
- Rose (#f43f5e)
- Orange (#f97316)
- Yellow (#eab308)
- Green (#22c55e)
- Cyan (#06b6d4)
- Blue (#3b82f6)
- Slate (#64748b)

**Icon Options:**
- musical-notes, heart, star, flame, leaf, sun, moon, cloud, lightning, rocket

### 2. PlaylistActionsModal

**Location:** `src/components/playlist/PlaylistActionsModal.tsx`

**Features:**
- Playlist header with color/icon preview
- Track count display
- Action menu with icons
- Delete confirmation dialog
- Responsive bottom sheet design

### 3. AddToPlaylistModal

**Location:** `src/components/playlist/AddToPlaylistModal.tsx`

**Features:**
- Track information display
- Playlist search functionality
- Existing playlist selection
- New playlist creation
- Duplicate prevention
- Empty state handling

## Integration with Library Screen

### Library Tab Integration

**Updated File:** `app/(tabs)/library.tsx`

**New Features:**
- Create playlist button (opens CreatePlaylistModal)
- Playlist-specific actions (opens PlaylistActionsModal)
- Track-to-playlist addition (opens AddToPlaylistModal)
- Playlist playback functionality
- Visual playlist indicators

**Key Changes:**
1. Added playlist management state
2. Updated add button to open create modal
3. Modified playlist ellipsis to open actions modal
4. Integrated "Add to Custom Playlist" in context menu
5. Added playlist playback logic

## Storage Management

### AsyncStorage Keys

```typescript
STORAGE_KEYS = {
  PLAYLISTS: 'luma:playlists',
  FAVORITES: 'luma:favorites',
  SEARCH_HISTORY: 'luma:search_history',
  RECENTLY_PLAYED: 'luma:recently_played',
  // ... other keys
}
```

### Data Persistence

**Automatic Persistence:**
- All playlist operations automatically save to AsyncStorage
- Optimistic UI updates with rollback on error
- Error handling with user feedback

**Storage Format:**
```json
[
  {
    "id": "playlist_1234567890_abc123",
    "name": "My Playlist",
    "description": "Description here",
    "tracks": [...],
    "color": "#6366f1",
    "icon": "musical-notes",
    "createdAt": 1234567890000,
    "updatedAt": 1234567890000,
    "playCount": 5,
    "lastPlayedAt": 1234567890000
  }
]
```

## API Methods Summary

### Library Store Methods

```typescript
// Core Operations
createPlaylist(name, description?, color?, icon?) → Promise<Playlist>
updatePlaylist(id, updates) → Promise<void>
deletePlaylist(id) → Promise<void>
getPlaylistById(id) → Playlist | null

// Track Operations
addTrackToPlaylist(playlistId, track) → Promise<void>
removeTrackFromPlaylist(playlistId, trackId) → Promise<void>
reorderPlaylistTracks(playlistId, trackIds) → Promise<void>

// Utility Operations
duplicatePlaylist(playlistId) → Promise<Playlist>
setPlaylistCover(playlistId, coverUrl) → Promise<void>
incrementPlaylistPlayCount(playlistId) → Promise<void>
updatePlaylistLastPlayed(playlistId) → Promise<void>

// Query Operations
loadPlaylists() → Promise<void>
getPlaylistById(id) → Playlist | null
```

## Error Handling

### Error Types

1. **Validation Errors:**
   - Empty playlist name
   - Duplicate track in playlist
   - Invalid playlist ID

2. **Storage Errors:**
   - AsyncStorage write failures
   - Data corruption
   - Storage quota exceeded

3. **User Feedback:**
   - Alert dialogs for all errors
   - Success confirmations
   - Loading states for async operations

### Error Recovery

- Automatic rollback on failure
- Re-load from storage on error
- User-friendly error messages
- Retry capability

## Performance Considerations

### Optimization Strategies

1. **Optimistic Updates:**
   - UI updates immediately
   - Background storage save
   - Rollback on failure

2. **Efficient Storage:**
   - Minimal data duplication
   - Track references instead of full objects
   - Compression for large playlists

3. **Memory Management:**
   - Lazy loading of playlist data
   - Caching of frequently accessed playlists
   - Cleanup of unused data

## Future Enhancements

### Potential Features

1. **Smart Playlists:**
   - Auto-generated based on criteria
   - Dynamic track selection
   - Rule-based filtering

2. **Collaborative Playlists:**
   - Sharing with other users
   - Real-time collaboration
   - Permission management

3. **Cloud Sync:**
   - Backup to cloud storage
   - Cross-device synchronization
   - Offline-first architecture

4. **Advanced Features:**
   - Playlist folders
   - Import/export functionality
   - Playlist templates
   - AI-powered recommendations

## Usage Examples

### Basic Playlist Creation

```typescript
// Create a simple playlist
const playlist = await createPlaylist("Workout Mix");

// Create with all options
const detailedPlaylist = await createPlaylist(
  "Chill Vibes",
  "Relaxing music for studying",
  "#8b5cf6",
  "moon"
);
```

### Adding Tracks

```typescript
// Add single track
await addTrackToPlaylist(playlist.id, track);

// Add multiple tracks
for (const track of tracks) {
  await addTrackToPlaylist(playlist.id, track);
}
```

### Playlist Operations

```typescript
// Update playlist metadata
await updatePlaylist(playlist.id, {
  name: "Updated Name",
  description: "New description"
});

// Set cover image
await setPlaylistCover(playlist.id, "https://example.com/cover.jpg");

// Duplicate playlist
const copy = await duplicatePlaylist(playlist.id);

// Delete playlist
await deletePlaylist(playlist.id);
```

### Track Management

```typescript
// Remove track
await removeTrackFromPlaylist(playlist.id, trackId);

// Reorder tracks
await reorderPlaylistTracks(playlist.id, [
  'track3', 'track1', 'track2'
]);
```

## Best Practices

1. **Always use error handling:**
   ```typescript
   try {
     await createPlaylist(name);
   } catch (error) {
     // Handle error
   }
   ```

2. **Validate user input:**
   - Check for empty names
   - Validate track existence
   - Prevent duplicates

3. **Provide user feedback:**
   - Show loading states
   - Display success messages
   - Handle errors gracefully

4. **Optimize performance:**
   - Batch operations when possible
   - Use optimistic updates
   - Implement proper caching

## Conclusion

The local playlist management system provides a complete, production-ready solution for creating, storing, and managing playlists without requiring any backend services. It's designed to be user-friendly, performant, and extensible for future enhancements.

All playlist data is stored locally on the device using AsyncStorage, ensuring privacy and offline functionality while providing a seamless user experience.