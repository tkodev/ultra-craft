import jadx.api.*;
import java.io.File;
import java.nio.file.*;
import java.util.*;
public class DumpSelected {
 public static void main(String[] args) throws Exception {
  JadxArgs options = new JadxArgs();
  options.setInputFiles(List.of(new File(args[0])));
  options.setSkipResources(true);
  options.setThreadsCount(2);
  Path output = Path.of(args[1]);
  Files.createDirectories(output);
  try (JadxDecompiler decompiler = new JadxDecompiler(options)) {
   decompiler.load();
   for (JavaClass cls : decompiler.getClasses()) {
    String name=cls.getFullName();
    if (Arrays.stream(args).skip(2).noneMatch(name::startsWith)) continue;
    Path target=output.resolve(name.replace('.', '/')+".java");
    Files.createDirectories(target.getParent());
    Files.writeString(target,cls.getCode());
    System.out.println(name);
   }
  }
 }
}
