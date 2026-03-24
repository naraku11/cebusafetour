import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class EmergencyFab extends StatelessWidget {
  const EmergencyFab({super.key});

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton.extended(
      onPressed: () => context.push('/emergency'),
      backgroundColor: const Color(0xFFEF4444),
      foregroundColor: Colors.white,
      icon: const Icon(Icons.sos_rounded),
      label: const Text('SOS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      elevation: 6,
    );
  }
}
