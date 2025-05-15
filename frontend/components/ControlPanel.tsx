import { View, Text, StyleSheet } from "react-native";
import { FC, ReactNode } from "react";

interface IControlPanel {
  children: ReactNode;
}
const ControlPanel: FC<IControlPanel> = (props) => {
  const { children } = props;
  return <View style={styles.controlPanel}>{children}</View>;
};

export default ControlPanel;

const styles = StyleSheet.create({
  controlPanel: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 32,
  },
});
