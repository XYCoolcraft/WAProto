# Riwayat perubahan WAProto

Terbaru di atas. Dibuat otomatis oleh update-proto.mjs.

## 2.3000.1052289812 → 2.3000.1052362152

By: https://t.me/XYCoolcrafts

Hanya nomor versi yang naik — tidak ada tipe/field/enum baru.

## 2.3000.1052191878 → 2.3000.1052289812

By: https://t.me/XYCoolcrafts

### Tipe baru (2)

- MsgOpaqueData.MusicData.LyricsLine
- MsgOpaqueData.MusicData.LyricsLine.WordOffset

### Field baru (2)

- MsgOpaqueData.MusicData.lyrics = 19
- MsgOpaqueData.MusicData.lyricsConfirmedAtS = 20

## 2.3000.1052070306 → 2.3000.1052191878

By: https://t.me/XYCoolcrafts

### Nilai enum baru (3)

- BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_SOCIAL_ENTITY_PREFETCH_SCHEDULER_ENABLED = 84
- ClientPayload.UserAgent.DeviceType.SMART_DISPLAY = 5
- ClientPayload.UserAgent.DeviceType.SMART_SPEAKER = 6

## 2.3000.1052015443 → 2.3000.1052070306

### Tipe baru (2)

- SyncActionValue.HatchCVMSecretAction
- SyncActionValue.SettingsSyncAction.MediaAutoDownloadQualitySetting

### Field baru (2)

- SyncActionValue.hatchCvmSecretAction = 101
- SyncActionValue.SettingsSyncAction.mediaAutoDownloadQuality = 35

### Nilai enum baru (2)

- MutationProps.HATCH_CVM_SECRET_ACTION = 101
- SyncActionValue.SettingsSyncAction.SettingKey.MEDIA_AUTO_DOWNLOAD_QUALITY = 35

## 2.3000.1051955322 → 2.3000.1052015443

Hanya nomor versi yang naik — tidak ada tipe/field/enum baru.

## 2.3000.1050756511 → 2.3000.1051955322

### Tipe baru (8)

- BotInterjectionMetadata
- DeviceCapabilities.BizAiWebOnboarding
- Message.MusicMessage.Lyrics
- Message.MusicMessage.Lyrics.Line
- Message.MusicMessage.Lyrics.Line.WordOffset
- Message.PeerDataOperationRequestMessage.HistorySyncOnDemandRequest.Mode
- Message.PeerDataOperationRequestMessage.RecentConversationsOnDemandRequest
- OmittedConversationMetadata

### Field baru (18)

- BizAccountLinkInfo.whatsappAcctEmail = 6
- BotMessageOrigin.proactiveMessageCampaignId = 2
- BotMetadata.interjectionMetadata = 45
- ClientPairingProps.companionAddPeerPayload = 7
- ContextInfo.sourceExperienceId = 84
- ContextInfo.sourceExperienceIds = 85
- ContextInfo.StatusAudienceMetadata.orgId = 4
- DeviceCapabilities.bizAiWebOnboarding = 13
- DeviceProps.HistorySyncConfig.supportOmittedConversationMetadata = 28
- HistorySync.omittedConversationMetadata = 25
- HistorySync.omittedConversationMetadataSnapshotId = 26
- Message.MusicMessage.lyrics = 6
- Message.PeerDataOperationRequestMessage.recentConversationsOnDemandRequest = 13
- Message.PeerDataOperationRequestMessage.HistorySyncOnDemandRequest.mode = 8
- MessageContextInfo.lightE2Ee = 22
- MsgOpaqueData.pollAddedOptionName = 64
- MsgOpaqueData.PollOption.localId = 4
- MsgOpaqueData.PollOption.addOptionMsgT = 5

### Nilai enum baru (8)

- BotCapabilityMetadata.BotCapabilityType.HATCH_CVM_ENABLED = 83
- ContextInfo.StatusAudienceMetadata.AudienceType.CUSTOM_LIST = 2
- ContextInfo.StatusAudienceMetadata.AudienceType.ORG = 3
- HistorySync.HistorySyncType.RECENT_CONVERSATIONS_ON_DEMAND = 9
- Message.HistorySyncType.RECENT_CONVERSATIONS_ON_DEMAND = 9
- Message.PeerDataOperationRequestType.RECENT_CONVERSATIONS_ON_DEMAND_REQUEST = 15
- WebMessageInfo.StubType.POLL_OPTIONS_REMOVED = 290
- WebMessageInfo.StubType.POLL_ADDED_OPTION_REMOVED = 291

## 2.3000.1050735291 → 2.3000.1050756511

Hanya nomor versi yang naik — tidak ada tipe/field/enum baru.

## 2.3000.1047787617 → 2.3000.1050735291

### Tipe baru (141)

- COMMAND_COMMAND_TYPE
- CallLogRecord.GuestInfo
- CombinedFingerprint
- Command
- DecryptMekForDistributionFromTransportSenderInput
- DecryptMekForDistributionFromTransportSenderInput.TransportSenderMEKDistributionSingleRecipient
- DecryptMekForDistributionFromTransportSenderResult
- DecryptMekForDistributionFromTransportSenderSuccess
- DecryptMekForDistributionInput
- DecryptMekForDistributionResult
- DecryptMekForDistributionSuccess
- DecryptSelfMmkDistributionInput
- DecryptSelfMmkDistributionResult
- DecryptSelfMmkDistributionSuccess
- DeriveAttachmentAccessTokenSecretInput
- DeriveAttachmentAccessTokenSecretResult
- DeriveAttachmentPrimaryKeySecretInput
- DeriveAttachmentPrimaryKeySecretResult
- DeriveMailboxAuthKeypairInput
- DeriveMailboxAuthKeypairResult
- DeriveMailboxEncryptionKeypairInput
- DeriveMailboxEncryptionKeypairResult
- DeriveMailboxSigningKeypairInput
- DeriveMailboxSigningKeypairResult
- DeriveMailboxSigningKeypairSuccess
- DeriveMessagingMailboxKeypairsInput
- DeriveMessagingMailboxKeypairsResult
- DeriveMessagingMailboxKeypairsSuccess
- DetachedDevicePublicData
- DeviceCapabilities.HostWriteMutationSupport
- DeviceCapabilities.NewsletterChatsMigration
- DeviceCapabilities.ReverseHistorySync
- DeviceCapabilities.ReverseHistorySync.Product
- EXTENDED_CONTENT_MESSAGE_CTA_BUTTON_TYPE
- EXTENDED_CONTENT_MESSAGE_EXTENDED_CONTENT_TYPE
- EXTENDED_CONTENT_MESSAGE_OVERLAY_ICON_GLYPH
- EXTENDED_CONTENT_MESSAGE_XMA_DATACLASS_TYPE
- EXTENDED_CONTENT_MESSAGE_XMA_LAYOUT_TYPE
- EncryptMekForDistributionInput
- EncryptMekForDistributionInput.MailboxAuthKP
- EncryptMekForDistributionResult
- EncryptMeksForDistributionFromTransportSenderInput
- EncryptMeksForDistributionFromTransportSenderInput.TransportSigningKP
- EncryptMeksForDistributionFromTransportSenderResult
- EpochPublicData
- EpochSignatures
- EventInviteAdditionalMetadata
- ExtendedContentMessage
- ExtendedContentMessage.CTA
- FUTURE_PROOF_BEHAVIOR
- FingerprintData
- GenerateMekInput
- GenerateMekResult
- GenerateMekRosterHashInput
- GenerateMekRosterHashResult
- GroupHistory
- GroupHistoryWithMessageBytes
- HostedState
- MENTION_MENTION_TYPE
- MandrakeCreateMmkInput
- MandrakeCreateMmkResult
- MandrakeDecryptMekInput
- MandrakeDecryptMekInput.EpochSenderPublicData
- MandrakeDecryptMekInput.MmkSenderPublicData
- MandrakeDecryptMekInput.PrecomputedEpochSenderPublicData
- MandrakeDecryptMekResult
- MandrakeDecryptMekSuccess
- MandrakeEncryptMekInput
- MandrakeEncryptMekInput.DetachedDeviceSender
- MandrakeEncryptMekInput.EpochSender
- MandrakeEncryptMekInput.MmkSender
- MandrakeEncryptMekResult
- MandrakeEncryptMekSuccess
- MandrakeEncryptMekSuccess.MekDistributionSingleRecipient
- MandrakeMekBundle
- MandrakeOpenEpochInput
- MandrakeOpenEpochResult
- MandrakeOpenEpochSuccess
- MandrakeOpenInitialEpochInput
- MandrakeOpenInitialEpochResult
- MandrakeValidateAndDecryptSelfMmkInput
- MandrakeValidateAndDecryptSelfMmkResult
- MandrakeValidateAndDecryptSelfMmkSuccess
- MandrakeValidateNewMmkFromDetachedDeviceInput
- MandrakeValidateNewMmkFromMailboxInput
- MandrakeValidateNewMmkResult
- MekBundle
- Mention
- MerkleMembershipProof
- Message.CoexConnectionDescriptor
- Message.EventInviteMessage.EventStatus
- Message.RequestLocationMessage
- Message.RequestLocationUpdateMessage
- Message.RequestLocationUpdateMessage.UpdateType
- MessageText
- MessagingMailboxPublicData
- MinosClientConfig
- MinosCommand
- MinosDecryptAndVerifyMessageInput
- MinosDecryptAndVerifyMessageResult
- MinosDecryptAndVerifyMessageSuccess
- MinosEncryptAndSignMessageInput
- MinosEncryptAndSignMessageResult
- MinosMessageMetadata
- MinosOpenEpochInput
- MinosOpenEpochResult
- MinosOpenInitialEpochInput
- MinosOpenInitialEpochResult
- MinosSignedEpoch
- MinosThreadIdFromActThreadIdInput
- MinosThreadIdFromActThreadIdResult
- MinosThreadIdFromOneToOneThreadInput
- MinosThreadIdFromOneToOneThreadResult
- MinosValidateEpochInput
- MinosValidateEpochResult
- MinosVerifySingleEpochInput
- MinosVerifySingleEpochResult
- MmkDistribution
- MmkDistributionToDetachedDevice
- MmkDistributionToMailbox
- MmkFromDetachedDevice
- MsgOpaqueData.MusicData
- RecoverableHistoryConversation
- RoutingInfo
- SignedMmkDistributionFromMailbox
- SubProtocol
- SyncActionValue.BBProPendingCustomerBaseAction
- SyncActionValue.CommunityNestingStateAction
- SyncActionValue.CommunityNestingStateAction.NestingState
- SyncActionValue.GroupHistoryToggleAction
- SyncActionValue.GroupHistoryToggleAction.GroupHistoryToggleMode
- SyncActionValue.SharedDeviceSecretAction
- SyncdPlainTextRecord
- SyncdSnapshotRecovery
- UnCountedAssociatedMessageList
- UnCountedAssociatedMessageListWithMessageBytes
- WebMessageInfoWithMessageBytes
- WrapTransportSigningPublicKeyInput
- WrapTransportSigningPublicKeyResult
- WrapTransportSigningSecretKeyInput
- WrapTransportSigningSecretKeyResult

### Field baru (40)

- CallLogRecord.ParticipantInfo.guestInfo = 3
- ClientPayload.messageSts = 49
- ContextInfo.ExternalAdReplyInfo.productId = 34
- ContextInfo.ExternalAdReplyInfo.containsCtwaPromo = 35
- ContextInfo.ExternalAdReplyInfo.ctwaPromoResponseId = 36
- ContextInfo.ExternalAdReplyInfo.ctwaPromoOfferId = 37
- ContextInfo.ExternalAdReplyInfo.ctwaPromoAdEntryId = 38
- ContextInfo.ExternalAdReplyInfo.ctwaPromoResponseExpiresAtSeconds = 39
- ContextInfo.ExternalAdReplyInfo.ctwaPromoSchemaVersion = 40
- ContextInfo.ExternalAdReplyInfo.ctwaPromoAdgroupId = 41
- Conversation.acp2HistoryWithheld = 65
- DeviceCapabilities.reverseHistorySync = 10
- DeviceCapabilities.newsletterChatsMigration = 11
- DeviceCapabilities.hostWriteMutationSupport = 12
- DeviceProps.HistorySyncConfig.supportUniversalReachChat = 26
- DeviceProps.HistorySyncConfig.supportOmittedConversationIndex = 27
- HistorySync.favoriteStickers = 22
- HistorySync.omittedConversations = 23
- HistorySync.omittedConversationsProvided = 24
- Message.instantImageMessage = 135
- Message.requestLocationMessage = 136
- Message.botGroupParticipantMessage = 137
- Message.requestLocationUpdateMessage = 138
- Message.ChatSolidColorWallpaper.doodleLightArgb = 4
- Message.ChatSolidColorWallpaper.doodleDarkArgb = 5
- Message.EventInviteMessage.coverImageHandle = 10
- Message.EventInviteMessage.locationName = 11
- Message.EventInviteMessage.lastUpdatedTsUsec = 12
- Message.EventInviteMessage.status = 13
- Message.FullHistorySyncOnDemandRequestMetadata.connection = 4
- Message.ProtocolMessage.additionalPromptIds = 38
- MsgOpaqueData.musicData = 63
- PollAdditionalMetadata.originalOptions = 3
- SyncActionValue.groupHistoryToggleAction = 97
- SyncActionValue.bbProPendingCustomerBaseAction = 98
- SyncActionValue.communityNestingStateAction = 99
- SyncActionValue.sharedDeviceSecretAction = 100
- SyncActionValue.ContactAction.birthday = 7
- SyncActionValue.LidContactAction.birthday = 4
- WebMessageInfo.eventInviteAdditionalMetadata = 84

### Nilai enum baru (59)

- AIThreadInfo.AIThreadClientInfo.AIThreadType.PRIVATE_SEARCH_CHAT = 4
- BotCapabilityMetadata.BotCapabilityType.HATCH_NOTIFICATION_METADATA_EVENT_ENABLED = 72
- BotCapabilityMetadata.BotCapabilityType.AI_SUGGESTED_REPLIES_ENABLED = 73
- BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_IN_APP_SURVEY_BLOKS = 74
- BotCapabilityMetadata.BotCapabilityType.RICH_RESPONSE_IMAGE_SOURCE_ATTRIBUTION = 75
- BotCapabilityMetadata.BotCapabilityType.HATCH_CONNECTOR_ACTION_CARD_ENABLED = 76
- BotCapabilityMetadata.BotCapabilityType.HATCH_SECURE_CREDENTIAL_CARD_ENABLED = 77
- BotCapabilityMetadata.BotCapabilityType.HATCH_BROWSER_TASK_CARD_ENABLED = 78
- BotCapabilityMetadata.BotCapabilityType.HATCH_ARTIFACT_CARD_ENABLED = 79
- BotCapabilityMetadata.BotCapabilityType.AI_STUDY_CENTER_ENABLED = 80
- BotCapabilityMetadata.BotCapabilityType.AI_MUSE_JARVIS_SCHEMA_ENABLED = 81
- BotCapabilityMetadata.BotCapabilityType.AI_STUDY_QUIZ_ENABLED = 82
- BotMessageOrigin.BotMessageOriginType.BOT_MESSAGE_ORIGIN_TYPE_META_AI_THREAD_WELCOME = 1
- BotMetricsEntryPoint.SHARE = 59
- ClientPayload.UserAgent.Platform.AUTOMOTIVE = 41
- ContextInfo.PairedMediaType.AV1_VIDEO_PARENT = 9
- ContextInfo.PairedMediaType.AV1_VIDEO_CHILD = 10
- ContextInfo.PairedMediaType.STREAMED_VIDEO_PARENT = 11
- ContextInfo.PairedMediaType.STREAMED_VIDEO_CHILD = 12
- DeviceProps.PlatformType.WAIL_WAI = 28
- DeviceProps.PlatformType.WAIL_ALEXA = 29
- DeviceProps.PlatformType.AUTOMOTIVE = 30
- Message.MusicMessage.MusicMessageStyle.MESSAGE_BUBBLE = 2
- Message.MusicMessage.MusicMessageStyle.LYRICS = 3
- MessageAddOn.MessageAddOnType.REQUEST_LOCATION_UPDATE = 5
- MessageAssociation.AssociationType.AV1_VIDEO_DUAL_UPLOAD = 21
- MessageAssociation.AssociationType.STREAMED_HD_VIDEO_DUAL_UPLOAD = 22
- MutationProps.GROUP_HISTORY_TOGGLE_ACTION = 97
- MutationProps.BB_PRO_PENDING_CUSTOMER_BASE_ACTION = 98
- MutationProps.COMMUNITY_NESTING_STATE_ACTION = 99
- MutationProps.SHARED_DEVICE_SECRET_ACTION = 100
- SyncActionValue.LabelEditAction.ListType.ONE_ON_ONE = 20
- WebMessageInfo.StubType.BIZ_CALLBACK_DISABLED = 244
- WebMessageInfo.StubType.GROUP_DEFAULT_SUB_GROUP_DEMOTE = 251
- WebMessageInfo.StubType.BIZ_BUSINESS_BROADCAST_ENTRY_POINT = 252
- WebMessageInfo.StubType.BOT_INLINE_TOS_CHAT = 253
- WebMessageInfo.StubType.CAMEO_REGISTERED_WITH_NEW_CHAT = 257
- WebMessageInfo.StubType.PRIVACY_SYSTEM_MESSAGE = 258
- WebMessageInfo.StubType.BIZ_AI_LEARNING_ENABLED_DISCLOSURE = 259
- WebMessageInfo.StubType.BIZ_AI_LEARNING_DISABLED_DISCLOSURE = 260
- WebMessageInfo.StubType.BIZ_AI_REPLIES_MUTED_HISTORICAL_CHAT = 261
- WebMessageInfo.StubType.INVITE_FROM_IG = 262
- WebMessageInfo.StubType.GROUP_ADMIN_FIRST_JOIN_VIA_LINK = 263
- WebMessageInfo.StubType.GROUP_ADMIN_FLOOD_JOIN_VIA_LINK = 264
- WebMessageInfo.StubType.BIZ_AI_REPLIES_MUTED_IRRELEVANT_HISTORICAL_CHAT = 265
- WebMessageInfo.StubType.PENDING_INVITE_CREATED = 266
- WebMessageInfo.StubType.CAMEO_CHAT_EXPIRED = 267
- WebMessageInfo.StubType.GROUP_PUSHNAME_SHARED = 270
- WebMessageInfo.StubType.BIZ_POST_SEND_OPT_OUT = 271
- WebMessageInfo.StubType.BB_PRO_BROADCAST_CHAT_CARD = 272
- WebMessageInfo.StubType.BOT_PROACTIVE_MESSAGE_ENABLED = 273
- WebMessageInfo.StubType.BOT_PROACTIVE_MESSAGE_DISABLED = 274
- WebMessageInfo.StubType.BOT_PROACTIVE_MESSAGE_FIRST_TIME = 275
- WebMessageInfo.StubType.DYNAMIC_AUDIENCE_LIST_CREATE = 276
- WebMessageInfo.StubType.DYNAMIC_AUDIENCE_LIST_UPDATE_LINK = 277
- WebMessageInfo.StubType.CHAT_WITH_BUSINESS_IN_DIRECTORY = 283
- WebMessageInfo.StubType.META_AI_THREAD_CREATED = 284
- WebMessageInfo.StubType.META_AI_CONNECTOR_LINKED = 285
- WebMessageInfo.StubType.SPLIT_PAYMENT_MARKED_AS_PAID = 289

### Dilewati: nomor sama, nama beda (nama lama dipertahankan) (2)

- Message.ChatSolidColorWallpaper.backgroundLightArgb = 1 (sudah ada: colorLight)
- Message.ChatSolidColorWallpaper.backgroundDarkArgb = 2 (sudah ada: colorDark)
