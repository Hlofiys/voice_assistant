import { useEffect, useRef } from "react";
import { Animated, Text, View, StyleSheet } from "react-native";
import { ThemedText } from "./ThemedText";

const prompts = [
  'Адреса ближайших аптек',
  'Адрес аптеки "Адель" на улице Лобанка в Минске',
  'Какой номер телефона у аптеки №3 "Экомаркет" на улице Одинцова?',
  'Аптека №7 "Адвантфарма" на проспекте Независимости',
];

const PromptSuggestions = () => {
  const animations = useRef(prompts.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      200,
      animations.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Примеры запросов:</ThemedText>
      {prompts.map((text, index) => (
        <Animated.View
          key={index}
          style={[
            styles.promptBox,
            {
              opacity: animations[index],
              transform: [
                {
                  translateY: animations[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.promptText}>{text}</Text>
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 24,
    paddingHorizontal: 20,
  },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },
  promptBox: {
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  promptText: {
    fontSize: 16,
    color: "#555",
  },
});

export default PromptSuggestions;
