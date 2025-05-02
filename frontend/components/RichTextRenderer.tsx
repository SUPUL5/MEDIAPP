// frontend/components/RichTextRenderer.tsx
import React from 'react';
import { Text, View, StyleSheet, TextStyle, ViewStyle } from 'react-native';

interface RichTextStyles {
    baseText?: TextStyle;
    boldText?: TextStyle;
    listItemContainer?: ViewStyle;
    bulletPoint?: TextStyle;
    listItemText?: TextStyle;
}

// Default internal styles for the renderer
const defaultStyles = StyleSheet.create({
    baseText: { // Default style if none provided
        fontSize: 15,
        color: '#1F2937', // Default bot text color
        lineHeight: 21,
        // marginBottom: 3, // Removed marginBottom here, let parent control spacing between lines/blocks
    },
    boldText: {
        fontWeight: 'bold',
    },
    listItemContainer: {
        flexDirection: 'row',
        marginLeft: 10, // Indent list items
        marginVertical: 2, // Space between list items
        alignItems: 'flex-start', // Align bullet with the start of the text line
    },
    bulletPoint: {
        marginRight: 6,
        // fontSize: 15, // Inherit size
        // lineHeight: 21, // Inherit line height
        // color: '#1F2937', // Inherit color
    },
    listItemText: {
        flex: 1, // Allow text to wrap
        // fontSize: 15, // Inherit size
        // lineHeight: 21, // Inherit line height
        // color: '#1F2937', // Inherit color
    },
    newlineText: { // Style specifically for rendered newlines (mostly for margin)
       // height: 8, // Add a small vertical space for newlines between blocks
    },
});

export const renderRichText = (
    text: string | null | undefined,
    baseTextStyle: TextStyle = defaultStyles.baseText, // Use provided base style or default
    customStyles: RichTextStyles = {} // Allow overriding specific parts
): React.ReactNode => {

    if (!text) return null;

    // Combine default and custom styles
    const styles = {
        baseText: { ...baseTextStyle, ...customStyles.baseText },
        boldText: { ...baseTextStyle, ...defaultStyles.boldText, ...customStyles.boldText },
        listItemContainer: { ...defaultStyles.listItemContainer, ...customStyles.listItemContainer },
        bulletPoint: { ...baseTextStyle, ...defaultStyles.bulletPoint, ...customStyles.bulletPoint },
        listItemText: { ...baseTextStyle, ...defaultStyles.listItemText, ...customStyles.listItemText },
        newlineText: { ...defaultStyles.newlineText }, // Include newline style
    };

    // Regex to capture bold, list items (at line start), newlines, and other text
    // Added capturing group for list item text content
    // Added capturing group for normal text
    const regex = /(\*\*.*?\*\*)|(^[*\-]\s)(.*)|(\n)|([^*\n]+)/gm;
    let match;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    // Use exec to iterate through matches sequentially
    while ((match = regex.exec(text)) !== null) {
        // Add any plain text before the current match
        if (match.index > lastIndex) {
            elements.push(
                <Text key={`text-${lastIndex}`} style={styles.baseText}>
                    {text.substring(lastIndex, match.index)}
                </Text>
            );
        }

        // Process the match based on which group captured
        if (match[1]) { // Bold text (**text**)
            elements.push(
                <Text key={`bold-${match.index}`} style={styles.boldText}>
                    {match[1].slice(2, -2)}
                </Text>
            );
        } else if (match[2] && match[3]) { // List item (* item or - item)
            elements.push(
                <View key={`list-${match.index}`} style={styles.listItemContainer}>
                    <Text style={styles.bulletPoint}>•</Text>
                    {/* Render the list item text, potentially applying bold within it */}
                    <Text style={styles.listItemText}>{renderRichText(match[3], baseTextStyle, customStyles)}</Text>
                </View>
            );
        } else if (match[4]) { // Newline (\n)
             // Render newline as a Text component, potentially with vertical margin/height if needed
             // Often, just letting the natural flow handle newlines between Text blocks is sufficient.
             // If extra space is needed:
              elements.push(<Text key={`newline-${match.index}`} style={styles.newlineText}>{"\n"}</Text>);
        } else if (match[5]) { // Normal text segment
            elements.push(
                <Text key={`text-${match.index}`} style={styles.baseText}>
                    {match[5]}
                </Text>
            );
        }

        lastIndex = regex.lastIndex;
    }

    // Add any remaining text after the last match
    if (lastIndex < text.length) {
        elements.push(
            <Text key={`text-${lastIndex}`} style={styles.baseText}>
                {text.substring(lastIndex)}
            </Text>
        );
    }

    return elements;
};