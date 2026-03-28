import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../l10n/app_localizations.dart';
import '../../utils/theme.dart';

// ── FAQ Data Model ──────────────────────────────────────────────────────────

class _FaqItem {
  final String question;
  final String answer;
  const _FaqItem({required this.question, required this.answer});
}

class _FaqSection {
  final String title;
  final IconData icon;
  final Color color;
  final List<_FaqItem> items;
  const _FaqSection({required this.title, required this.icon, required this.color, required this.items});
}

// ── Help Screen ─────────────────────────────────────────────────────────────

class HelpFaqScreen extends ConsumerStatefulWidget {
  const HelpFaqScreen({super.key});

  @override
  ConsumerState<HelpFaqScreen> createState() => _HelpFaqScreenState();
}

class _HelpFaqScreenState extends ConsumerState<HelpFaqScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _searchController.addListener(() {
      setState(() => _searchQuery = _searchController.text.toLowerCase());
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  List<_FaqSection> _getFaqSections(AppLocalizations l) => [
    _FaqSection(
      title: l.helpGettingStarted,
      icon: Icons.rocket_launch_outlined,
      color: const Color(0xFF0EA5E9),
      items: [
        _FaqItem(
          question: l.faqWhatIsCebuSafeTour,
          answer: l.faqWhatIsCebuSafeTourAnswer,
        ),
        _FaqItem(
          question: l.faqHowToCreateAccount,
          answer: l.faqHowToCreateAccountAnswer,
        ),
        _FaqItem(
          question: l.faqIsAppFree,
          answer: l.faqIsAppFreeAnswer,
        ),
        _FaqItem(
          question: l.faqLanguageSupport,
          answer: l.faqLanguageSupportAnswer,
        ),
      ],
    ),
    _FaqSection(
      title: l.helpSafetyFeatures,
      icon: Icons.shield_outlined,
      color: const Color(0xFF10B981),
      items: [
        _FaqItem(
          question: l.faqSafetyStatuses,
          answer: l.faqSafetyStatusesAnswer,
        ),
        _FaqItem(
          question: l.faqAdvisoryAlerts,
          answer: l.faqAdvisoryAlertsAnswer,
        ),
        _FaqItem(
          question: l.faqEmergencyReport,
          answer: l.faqEmergencyReportAnswer,
        ),
        _FaqItem(
          question: l.faqEmergencyContacts,
          answer: l.faqEmergencyContactsAnswer,
        ),
        _FaqItem(
          question: l.faqCrowdLevel,
          answer: l.faqCrowdLevelAnswer,
        ),
      ],
    ),
    _FaqSection(
      title: l.helpExploring,
      icon: Icons.explore_outlined,
      color: const Color(0xFFF59E0B),
      items: [
        _FaqItem(
          question: l.faqFindAttractions,
          answer: l.faqFindAttractionsAnswer,
        ),
        _FaqItem(
          question: l.faqTripPlanner,
          answer: l.faqTripPlannerAnswer,
        ),
        _FaqItem(
          question: l.faqReviews,
          answer: l.faqReviewsAnswer,
        ),
        _FaqItem(
          question: l.faqGetDirections,
          answer: l.faqGetDirectionsAnswer,
        ),
      ],
    ),
    _FaqSection(
      title: l.helpAccountProfile,
      icon: Icons.person_outlined,
      color: const Color(0xFF8B5CF6),
      items: [
        _FaqItem(
          question: l.faqEditProfile,
          answer: l.faqEditProfileAnswer,
        ),
        _FaqItem(
          question: l.faqChangePhoto,
          answer: l.faqChangePhotoAnswer,
        ),
        _FaqItem(
          question: l.faqResetPassword,
          answer: l.faqResetPasswordAnswer,
        ),
        _FaqItem(
          question: l.faqDeleteAccount,
          answer: l.faqDeleteAccountAnswer,
        ),
      ],
    ),
    _FaqSection(
      title: l.helpNotifications,
      icon: Icons.notifications_outlined,
      color: const Color(0xFFEF4444),
      items: [
        _FaqItem(
          question: l.faqNotificationTypes,
          answer: l.faqNotificationTypesAnswer,
        ),
        _FaqItem(
          question: l.faqEnableNotifications,
          answer: l.faqEnableNotificationsAnswer,
        ),
        _FaqItem(
          question: l.faqMissedNotification,
          answer: l.faqMissedNotificationAnswer,
        ),
      ],
    ),
    _FaqSection(
      title: l.helpTroubleshooting,
      icon: Icons.build_outlined,
      color: const Color(0xFF6B7280),
      items: [
        _FaqItem(
          question: l.faqAppNotLoading,
          answer: l.faqAppNotLoadingAnswer,
        ),
        _FaqItem(
          question: l.faqLocationNotWorking,
          answer: l.faqLocationNotWorkingAnswer,
        ),
        _FaqItem(
          question: l.faqOfflineUse,
          answer: l.faqOfflineUseAnswer,
        ),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.helpAndFaq),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryColor,
          unselectedLabelColor: Colors.grey,
          indicatorColor: AppTheme.primaryColor,
          tabs: [
            Tab(icon: const Icon(Icons.quiz_outlined, size: 20), text: l.helpTabFaq),
            Tab(icon: const Icon(Icons.menu_book_outlined, size: 20), text: l.helpTabGuide),
            Tab(icon: const Icon(Icons.support_agent_outlined, size: 20), text: l.helpTabContact),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildFaqTab(l),
          _buildGuideTab(l),
          _buildContactTab(l),
        ],
      ),
    );
  }

  // ── FAQ Tab ───────────────────────────────────────────────────────────────

  Widget _buildFaqTab(AppLocalizations l) {
    final sections = _getFaqSections(l);

    final filtered = _searchQuery.isEmpty
        ? sections
        : sections
            .map((s) => _FaqSection(
                  title: s.title,
                  icon: s.icon,
                  color: s.color,
                  items: s.items
                      .where((item) =>
                          item.question.toLowerCase().contains(_searchQuery) ||
                          item.answer.toLowerCase().contains(_searchQuery))
                      .toList(),
                ))
            .where((s) => s.items.isNotEmpty)
            .toList();

    return Column(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: l.helpSearchHint,
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () => _searchController.clear(),
                    )
                  : null,
              filled: true,
              fillColor: Colors.grey.shade50,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade200),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade200),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppTheme.primaryColor, width: 1.5),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
        ),

        // FAQ content
        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.search_off, size: 56, color: Colors.grey.shade300),
                      const SizedBox(height: 12),
                      Text(l.helpNoResults,
                          style: TextStyle(color: Colors.grey.shade500, fontWeight: FontWeight.w500)),
                      const SizedBox(height: 4),
                      Text(l.helpTryDifferent,
                          style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  itemCount: filtered.length,
                  itemBuilder: (ctx, i) => _FaqSectionWidget(section: filtered[i]),
                ),
        ),
      ],
    );
  }

  // ── Guide Tab ─────────────────────────────────────────────────────────────

  Widget _buildGuideTab(AppLocalizations l) {
    final guides = [
      _GuideData(
        icon: Icons.explore_outlined,
        color: const Color(0xFF0EA5E9),
        title: l.guideExploreTitle,
        steps: [
          l.guideExploreStep1,
          l.guideExploreStep2,
          l.guideExploreStep3,
          l.guideExploreStep4,
          l.guideExploreStep5,
        ],
      ),
      _GuideData(
        icon: Icons.shield_outlined,
        color: const Color(0xFF10B981),
        title: l.guideSafetyTitle,
        steps: [
          l.guideSafetyStep1,
          l.guideSafetyStep2,
          l.guideSafetyStep3,
          l.guideSafetyStep4,
        ],
      ),
      _GuideData(
        icon: Icons.warning_amber_outlined,
        color: const Color(0xFFEF4444),
        title: l.guideEmergencyTitle,
        steps: [
          l.guideEmergencyStep1,
          l.guideEmergencyStep2,
          l.guideEmergencyStep3,
          l.guideEmergencyStep4,
          l.guideEmergencyStep5,
        ],
      ),
      _GuideData(
        icon: Icons.map_outlined,
        color: const Color(0xFF14B8A6),
        title: l.guideTripTitle,
        steps: [
          l.guideTripStep1,
          l.guideTripStep2,
          l.guideTripStep3,
          l.guideTripStep4,
        ],
      ),
      _GuideData(
        icon: Icons.star_outlined,
        color: const Color(0xFFF59E0B),
        title: l.guideReviewTitle,
        steps: [
          l.guideReviewStep1,
          l.guideReviewStep2,
          l.guideReviewStep3,
        ],
      ),
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Header
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0C4A6E), AppTheme.primaryColor],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.menu_book_outlined, color: Colors.white, size: 32),
              const SizedBox(height: 12),
              Text(l.guideHeaderTitle,
                  style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Text(l.guideHeaderSubtitle,
                  style: const TextStyle(color: Colors.white70, fontSize: 14)),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Guide cards
        ...guides.map((guide) => _GuideCard(guide: guide)),
      ],
    );
  }

  // ── Contact Tab ───────────────────────────────────────────────────────────

  Widget _buildContactTab(AppLocalizations l) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Header
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0C4A6E), AppTheme.primaryColor],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.support_agent_outlined, color: Colors.white, size: 32),
              const SizedBox(height: 12),
              Text(l.contactHeaderTitle,
                  style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Text(l.contactHeaderSubtitle,
                  style: const TextStyle(color: Colors.white70, fontSize: 14)),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Contact cards
        _ContactCard(
          icon: Icons.email_outlined,
          color: const Color(0xFF0EA5E9),
          title: l.contactEmailTitle,
          subtitle: 'support@cebusafetour.com',
          detail: l.contactEmailDetail,
          onTap: () => _launchUrl('mailto:support@cebusafetour.com'),
        ),
        _ContactCard(
          icon: Icons.phone_outlined,
          color: const Color(0xFF10B981),
          title: l.contactPhoneTitle,
          subtitle: '+63 32 123 4567',
          detail: l.contactPhoneDetail,
          onTap: () => _launchUrl('tel:+63321234567'),
        ),
        _ContactCard(
          icon: Icons.local_hospital_outlined,
          color: const Color(0xFFEF4444),
          title: l.contactEmergencyTitle,
          subtitle: '911',
          detail: l.contactEmergencyDetail,
          onTap: () => _launchUrl('tel:911'),
        ),

        const SizedBox(height: 20),

        // Emergency Numbers Section
        Text(l.contactLocalEmergency,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),

        _EmergencyNumberTile(
          emoji: '🚔',
          name: l.contactPNP,
          number: '166 / (032) 253-5636',
          onTap: () => _launchUrl('tel:166'),
        ),
        _EmergencyNumberTile(
          emoji: '🔥',
          name: l.contactBFP,
          number: '160 / (032) 253-6489',
          onTap: () => _launchUrl('tel:160'),
        ),
        _EmergencyNumberTile(
          emoji: '🏥',
          name: l.contactCebuDocHospital,
          number: '(032) 255-5555',
          onTap: () => _launchUrl('tel:+63322555555'),
        ),
        _EmergencyNumberTile(
          emoji: '🚑',
          name: l.contactRedCross,
          number: '143 / (032) 253-6326',
          onTap: () => _launchUrl('tel:143'),
        ),
        _EmergencyNumberTile(
          emoji: '🌊',
          name: l.contactCoastGuard,
          number: '(032) 254-4315',
          onTap: () => _launchUrl('tel:+63322544315'),
        ),
        _EmergencyNumberTile(
          emoji: '🛡',
          name: l.contactCDRRMO,
          number: '(032) 253-1142',
          onTap: () => _launchUrl('tel:+63322531142'),
        ),

        const SizedBox(height: 20),

        // Safety tips
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFFEF3C7),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFFDE68A)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.lightbulb_outlined, color: Color(0xFFD97706), size: 20),
                  const SizedBox(width: 8),
                  Text(l.contactSafetyTipsTitle,
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF92400E))),
                ],
              ),
              const SizedBox(height: 10),
              ...(<String>[
                l.contactTip1,
                l.contactTip2,
                l.contactTip3,
                l.contactTip4,
                l.contactTip5,
              ].map((tip) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('• ', style: TextStyle(color: Color(0xFF92400E), fontWeight: FontWeight.bold)),
                        Expanded(child: Text(tip, style: const TextStyle(fontSize: 13, color: Color(0xFF78350F)))),
                      ],
                    ),
                  ))),
            ],
          ),
        ),

        const SizedBox(height: 16),
        Center(
          child: Text('CebuSafeTour v1.0.0',
              style: TextStyle(color: Colors.grey.shade400, fontSize: 12)),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}

// ── FAQ Section Widget ──────────────────────────────────────────────────────

class _FaqSectionWidget extends StatelessWidget {
  final _FaqSection section;
  const _FaqSectionWidget({required this.section});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: section.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(section.icon, color: section.color, size: 20),
              ),
              const SizedBox(width: 10),
              Text(section.title,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('${section.items.length}',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w500)),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // FAQ items
          ...section.items.map((item) => _FaqTile(item: item)),
        ],
      ),
    );
  }
}

// ── FAQ Tile (Expandable) ───────────────────────────────────────────────────

class _FaqTile extends StatefulWidget {
  final _FaqItem item;
  const _FaqTile({required this.item});

  @override
  State<_FaqTile> createState() => _FaqTileState();
}

class _FaqTileState extends State<_FaqTile> with SingleTickerProviderStateMixin {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: _expanded ? AppTheme.primaryColor.withValues(alpha: 0.3) : Colors.grey.shade100,
        ),
      ),
      elevation: _expanded ? 1 : 0,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => setState(() => _expanded = !_expanded),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.help_outline,
                    size: 18,
                    color: _expanded ? AppTheme.primaryColor : Colors.grey.shade400,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      widget.item.question,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: _expanded ? AppTheme.primaryColor : Colors.grey.shade800,
                      ),
                    ),
                  ),
                  Icon(
                    _expanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                    color: Colors.grey.shade400,
                    size: 20,
                  ),
                ],
              ),
              if (_expanded) ...[
                const SizedBox(height: 12),
                Divider(height: 1, color: Colors.grey.shade100),
                const SizedBox(height: 12),
                Text(
                  widget.item.answer,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey.shade700,
                    height: 1.6,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ── Guide Card ──────────────────────────────────────────────────────────────

class _GuideData {
  final IconData icon;
  final Color color;
  final String title;
  final List<String> steps;
  const _GuideData({
    required this.icon,
    required this.color,
    required this.title,
    required this.steps,
  });
}

class _GuideCard extends StatefulWidget {
  final _GuideData guide;
  const _GuideCard({required this.guide});

  @override
  State<_GuideCard> createState() => _GuideCardState();
}

class _GuideCardState extends State<_GuideCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: _expanded ? 2 : 0,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => setState(() => _expanded = !_expanded),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: widget.guide.color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(widget.guide.icon, color: widget.guide.color, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(widget.guide.title,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        Text('${widget.guide.steps.length} steps',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                      ],
                    ),
                  ),
                  Icon(
                    _expanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                    color: Colors.grey.shade400,
                  ),
                ],
              ),
              if (_expanded) ...[
                const SizedBox(height: 16),
                ...widget.guide.steps.asMap().entries.map((entry) {
                  final i = entry.key;
                  final step = entry.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 26,
                          height: 26,
                          decoration: BoxDecoration(
                            color: widget.guide.color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '${i + 1}',
                            style: TextStyle(
                              color: widget.guide.color,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(step,
                              style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.4)),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ── Contact Card ────────────────────────────────────────────────────────────

class _ContactCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final String detail;
  final VoidCallback onTap;

  const _ContactCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.detail,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: TextStyle(color: color, fontWeight: FontWeight.w500, fontSize: 14)),
                    const SizedBox(height: 2),
                    Text(detail, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey.shade400),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Emergency Number Tile ───────────────────────────────────────────────────

class _EmergencyNumberTile extends StatelessWidget {
  final String emoji;
  final String name;
  final String number;
  final VoidCallback onTap;

  const _EmergencyNumberTile({
    required this.emoji,
    required this.name,
    required this.number,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: Text(emoji, style: const TextStyle(fontSize: 24)),
        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Text(number, style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
        trailing: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFF10B981).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.phone, size: 18, color: Color(0xFF10B981)),
        ),
        onTap: onTap,
      ),
    );
  }
}
