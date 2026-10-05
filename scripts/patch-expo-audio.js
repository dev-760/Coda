const fs = require('fs');
const path = require('path');

const audioPlayerPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-audio',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'audio',
  'AudioPlayer.kt'
);

const audioControlsServicePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-audio',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'audio',
  'service',
  'AudioControlsService.kt'
);

const audioMediaSessionCallbackPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-audio',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'audio',
  'service',
  'AudioMediaSessionCallback.kt'
);

const metadataInjectingPlayerPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-audio',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'audio',
  'service',
  'MetadataInjectingPlayer.kt'
);

function patchAudioPlayer() {
  if (!fs.existsSync(audioPlayerPath)) return;
  let content = fs.readFileSync(audioPlayerPath, 'utf8');

  if (!content.includes('fun handleSkipNext()')) {
    const target = 'fun clearLockScreenControls() {';
    const addition = `fun handleSkipNext() {
    sendStatusUpdate(mapOf("remoteAction" to "next"))
  }

  fun handleSkipPrevious() {
    sendStatusUpdate(mapOf("remoteAction" to "previous"))
  }

  fun clearLockScreenControls() {`;
    content = content.replace(target, addition);
    fs.writeFileSync(audioPlayerPath, content, 'utf8');
    console.log('[patch-expo-audio] Patched AudioPlayer.kt');
  }
}

function patchAudioControlsService() {
  if (!fs.existsSync(audioControlsServicePath)) return;
  let content = fs.readFileSync(audioControlsServicePath, 'utf8');

  // Companion object constants
  if (!content.includes('ACTION_SKIP_NEXT')) {
    content = content.replace(
      'const val ACTION_SEEK_BACKWARD = "expo.modules.audio.action.SEEK_BACKWARD"',
      `const val ACTION_SEEK_BACKWARD = "expo.modules.audio.action.SEEK_BACKWARD"
    const val ACTION_SKIP_NEXT = "expo.modules.audio.action.SKIP_NEXT"
    const val ACTION_SKIP_PREVIOUS = "expo.modules.audio.action.SKIP_PREVIOUS"`
    );
    content = content.replace(
      'const val SEEK_INTERVAL_MS = 10000L',
      `const val SEEK_INTERVAL_MS = 10000L

    var activePlayer: AudioPlayer? = null`
    );
  }

  // onStartCommand
  if (!content.includes('ACTION_SKIP_NEXT -> currentPlayer?.handleSkipNext()')) {
    content = content.replace(
      'ACTION_SEEK_BACKWARD -> currentPlayerRef.seekTo(currentPlayerRef.currentPosition - SEEK_INTERVAL_MS)',
      `ACTION_SEEK_BACKWARD -> currentPlayerRef.seekTo(currentPlayerRef.currentPosition - SEEK_INTERVAL_MS)
        ACTION_SKIP_NEXT -> currentPlayer?.handleSkipNext()
        ACTION_SKIP_PREVIOUS -> currentPlayer?.handleSkipPrevious()`
    );
  }

  // Sync activePlayer
  if (!content.includes('activePlayer = player')) {
    content = content.replace(
      'currentPlayer = player\n    currentMetadata = metadata',
      'currentPlayer = player\n    activePlayer = player\n    currentMetadata = metadata'
    );
  }
  if (!content.includes('activePlayer = null')) {
    content = content.replace(
      'currentPlayer = null\n    currentMetadata = null',
      'currentPlayer = null\n    activePlayer = null\n    currentMetadata = null'
    );
  }

  // updateSessionCustomLayout
  if (content.includes('CommandButton.ICON_SKIP_BACK_10')) {
    const oldLayoutTarget = `    // Add seek backward button if enabled
    if (currentOptions?.showSeekBackward == true) {
      mediaButtons.add(
        CommandButton.Builder(CommandButton.ICON_SKIP_BACK_10)
          .setDisplayName("Seek Backward")
          .setEnabled(true)
          .setSessionCommand(SessionCommand(ACTION_SEEK_BACKWARD, Bundle.EMPTY))
          .setSlots(CommandButton.SLOT_BACK)
          .build()
      )
    }

    // Add play/pause button (always present)
    mediaButtons.add(
      CommandButton.Builder(if (isPlaying) CommandButton.ICON_PAUSE else CommandButton.ICON_PLAY)
        .setDisplayName(if (isPlaying) "Pause" else "Play")
        .setEnabled(true)
        .setPlayerCommand(Player.COMMAND_PLAY_PAUSE)
        .setSlots(CommandButton.SLOT_CENTRAL)
        .build()
    )

    // Add seek forward button if enabled
    if (currentOptions?.showSeekForward == true) {
      mediaButtons.add(
        CommandButton.Builder(CommandButton.ICON_SKIP_FORWARD_10)
          .setDisplayName("Seek Forward")
          .setEnabled(true)
          .setSessionCommand(SessionCommand(ACTION_SEEK_FORWARD, Bundle.EMPTY))
          .setSlots(CommandButton.SLOT_FORWARD)
          .build()
      )
    }`;

    const newLayout = `    // Add previous button
    mediaButtons.add(
      CommandButton.Builder(CommandButton.ICON_PREVIOUS)
        .setDisplayName("Previous")
        .setEnabled(true)
        .setSessionCommand(SessionCommand(ACTION_SKIP_PREVIOUS, Bundle.EMPTY))
        .setSlots(CommandButton.SLOT_BACK)
        .build()
    )

    // Add play/pause button (always present)
    mediaButtons.add(
      CommandButton.Builder(if (isPlaying) CommandButton.ICON_PAUSE else CommandButton.ICON_PLAY)
        .setDisplayName(if (isPlaying) "Pause" else "Play")
        .setEnabled(true)
        .setPlayerCommand(Player.COMMAND_PLAY_PAUSE)
        .setSlots(CommandButton.SLOT_CENTRAL)
        .build()
    )

    // Add next button
    mediaButtons.add(
      CommandButton.Builder(CommandButton.ICON_NEXT)
        .setDisplayName("Next")
        .setEnabled(true)
        .setSessionCommand(SessionCommand(ACTION_SKIP_NEXT, Bundle.EMPTY))
        .setSlots(CommandButton.SLOT_FORWARD)
        .build()
    )`;

    content = content.replace(oldLayoutTarget, newLayout);
  }

  // Small icon and notification actions for older SDK
  if (content.includes('setSmallIcon(androidx.media3.session.R.drawable.media3_icon_circular_play)')) {
    content = content.replace(
      'val builder = NotificationCompat.Builder(this, CHANNEL_ID)\n      .setSmallIcon(androidx.media3.session.R.drawable.media3_icon_circular_play)',
      `val smallIconRes = try {
      val res = applicationInfo.icon
      if (res != 0) res else androidx.media3.session.R.drawable.media3_icon_circular_play
    } catch (_: Exception) {
      androidx.media3.session.R.drawable.media3_icon_circular_play
    }

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(smallIconRes)`
    );
  }

  fs.writeFileSync(audioControlsServicePath, content, 'utf8');
  console.log('[patch-expo-audio] Patched AudioControlsService.kt');
}

function patchAudioMediaSessionCallback() {
  if (!fs.existsSync(audioMediaSessionCallbackPath)) return;
  let content = fs.readFileSync(audioMediaSessionCallbackPath, 'utf8');

  if (content.includes('.remove(Player.COMMAND_SEEK_TO_PREVIOUS)')) {
    content = content.replace(
      `            // Remove track navigation commands
            .remove(Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM)
            .remove(Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM)
            .remove(Player.COMMAND_SEEK_TO_PREVIOUS)
            .remove(Player.COMMAND_SEEK_TO_NEXT)`,
      `            .add(Player.COMMAND_SEEK_TO_PREVIOUS)
            .add(Player.COMMAND_SEEK_TO_NEXT)`
    );
  }

  if (!content.includes('ACTION_SKIP_PREVIOUS')) {
    content = content.replace(
      '.add(SessionCommand(AudioControlsService.ACTION_SEEK_BACKWARD, Bundle.EMPTY))',
      `.add(SessionCommand(AudioControlsService.ACTION_SKIP_PREVIOUS, Bundle.EMPTY))
            .add(SessionCommand(AudioControlsService.ACTION_SKIP_NEXT, Bundle.EMPTY))
            .add(SessionCommand(AudioControlsService.ACTION_SEEK_BACKWARD, Bundle.EMPTY))`
    );
  }

  if (!content.includes('AudioControlsService.ACTION_SKIP_NEXT ->')) {
    content = content.replace(
      'when (command.customAction) {',
      `when (command.customAction) {
      AudioControlsService.ACTION_SKIP_NEXT -> {
        AudioControlsService.activePlayer?.handleSkipNext()
      }
      AudioControlsService.ACTION_SKIP_PREVIOUS -> {
        AudioControlsService.activePlayer?.handleSkipPrevious()
      }`
    );
  }

  fs.writeFileSync(audioMediaSessionCallbackPath, content, 'utf8');
  console.log('[patch-expo-audio] Patched AudioMediaSessionCallback.kt');
}

function patchMetadataInjectingPlayer() {
  if (!fs.existsSync(metadataInjectingPlayerPath)) return;
  let content = fs.readFileSync(metadataInjectingPlayerPath, 'utf8');

  if (!content.includes('override fun seekToNext()')) {
    const target = 'fun updateMetadata(metadata: Metadata?) {';
    const addition = `override fun seekToNext() {
    AudioControlsService.activePlayer?.handleSkipNext()
  }

  override fun seekToPrevious() {
    AudioControlsService.activePlayer?.handleSkipPrevious()
  }

  fun updateMetadata(metadata: Metadata?) {`;
    content = content.replace(target, addition);
    fs.writeFileSync(metadataInjectingPlayerPath, content, 'utf8');
    console.log('[patch-expo-audio] Patched MetadataInjectingPlayer.kt');
  }
}

try {
  patchAudioPlayer();
  patchAudioControlsService();
  patchAudioMediaSessionCallback();
  patchMetadataInjectingPlayer();
  console.log('[patch-expo-audio] Completed successfully.');
} catch (err) {
  console.error('[patch-expo-audio] Error patching expo-audio:', err);
  process.exit(0); // Do not fail build if optional patch encounters unexpected structure
}
