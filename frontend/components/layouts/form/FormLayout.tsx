import { View, Text, StyleSheet } from "react-native";
import { FC } from "react";
import { IWithChildren } from "@/interfaces/IWithChildren";

const FormLayout: FC<IWithChildren> = (props) => {
  const { children } = props;
  return <View style={styles.formContainer}>{children}</View>;
};

export default FormLayout;
const styles = StyleSheet.create({
  formContainer: {
    width: "100%",
    display: "flex",
    gap: 24,
    marginBottom: 32,
  },
});
