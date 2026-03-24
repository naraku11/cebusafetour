import 'package:flutter/material.dart';
import '../utils/constants.dart';
import '../providers/language_provider.dart';

class LanguagePickerSheet extends StatefulWidget {
  final String title;
  final String searchHint;
  final String currentCode;
  const LanguagePickerSheet({
    super.key,
    required this.title,
    required this.searchHint,
    required this.currentCode,
  });

  @override
  State<LanguagePickerSheet> createState() => _LanguagePickerSheetState();
}

class _LanguagePickerSheetState extends State<LanguagePickerSheet> {
  final _searchCtrl = TextEditingController();
  List<Map<String, String>> _filtered = List.from(AppConstants.languages);

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearch(String q) {
    final lower = q.toLowerCase();
    setState(() {
      _filtered = q.isEmpty
          ? List.from(AppConstants.languages)
          : AppConstants.languages
              .where((l) => l['label']!.toLowerCase().contains(lower) || l['code']!.contains(lower))
              .toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.of(context).size.height * 0.85;
    return Material(
      color: Colors.transparent,
      child: Container(
        height: height,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(children: [
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 6),
            width: 40, height: 4,
            decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(children: [
              Expanded(
                child: Text(widget.title,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ),
              IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: TextField(
              controller: _searchCtrl,
              autofocus: true,
              onChanged: _onSearch,
              decoration: InputDecoration(
                hintText: widget.searchHint,
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () { _searchCtrl.clear(); _onSearch(''); },
                      )
                    : null,
                filled: true,
                fillColor: Colors.grey.shade100,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: _filtered.isEmpty
                ? Center(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      const Text('🔍', style: TextStyle(fontSize: 36)),
                      const SizedBox(height: 8),
                      Text('No results for "${_searchCtrl.text}"',
                          style: const TextStyle(color: Colors.grey)),
                    ]),
                  )
                : ListView.builder(
                    keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                    itemCount: _filtered.length,
                    itemBuilder: (_, i) {
                      final lang = _filtered[i];
                      final code = lang['code']!;
                      final isSelected = code == widget.currentCode;
                      return ListTile(
                        leading: Text(languageFlag(code),
                            style: const TextStyle(fontSize: 24)),
                        title: Text(lang['label']!),
                        trailing: isSelected
                            ? const Icon(Icons.check, color: Color(0xFF0EA5E9))
                            : null,
                        selected: isSelected,
                        onTap: () => Navigator.pop(context, code),
                        dense: true,
                      );
                    },
                  ),
          ),
        ]),
      ),
    );
  }
}
