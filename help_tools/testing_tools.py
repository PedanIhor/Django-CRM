from functools import wraps

def name_printable(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        print(f"\n~~~~~~~~~~~~~ {fn.__name__} ~~~~~~~~~~~~~~~")
        return fn(*args, **kwargs)
    return wrapper

def case_tests_printable(case):
    for method in dir(case):
        if method.startswith("test_"):
            setattr(case, method, name_printable(getattr(case, method)))
    return case
