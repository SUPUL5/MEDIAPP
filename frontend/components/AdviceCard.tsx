// frontend/components/AdviceCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { renderRichText } from './RichTextRenderer'; // Import the renderer

interface AdviceCardProps {
  advice: string;
}

const AdviceCard: React.FC<AdviceCardProps> = ({ advice }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <FontAwesome5 name="lightbulb" size={16} color="#B45309" style={styles.icon} />
        {/* Title without colon */}
        <Text style={styles.title}>Home Care Advice</Text>
      </View>
      {/* Render advice using the rich text renderer */}
      <View style={styles.adviceTextContainer}>
        {renderRichText(advice, styles.adviceText)}
      </View>
       <Text style={styles.disclaimerText}>
            Remember this is general advice. Please consult a doctor for a diagnosis.
        </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFBEB', // Light yellow background
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    // No margin here, handled by the container in ChatPanel
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B', // Amber/Yellow accent
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    // Remove marginBottom if previously added here
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 14, // Slightly smaller title
    fontWeight: '600',
    color: '#B45309', // Darker amber text for title
  },
  adviceTextContainer: { // Container for the rich text content
     marginTop: 4,
  },
  adviceText: { // Base style for advice text segments
    fontSize: 14,
    color: '#4B5563', // Standard text color
    lineHeight: 20,
    marginBottom: 3, // Small space between paragraphs/list items if any
  },
  disclaimerText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default AdviceCard;