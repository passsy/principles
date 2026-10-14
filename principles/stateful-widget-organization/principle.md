# Nothing Between StatefulWidget and Its State

Keep a StatefulWidget and its State class next to each other, with no function, variable or other class declared between them.

When there's a `class MyWidget extends StatefulWidget` and a `class MyWidgetState extends State<MyWidget>` do not put anything function, variable or other class between them.
