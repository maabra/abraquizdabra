"""Independent numerical oracle. Reads stored questions, never generator code.

Uses alternative derivations (combinatorial Fibonacci, a DAG walk for Git,
explicit arrays and transactions) rather than the generator's expectedValue.
"""
import hashlib
import json
import math
import re
import sys
from fractions import Fraction
from pathlib import Path


def infer_input(topic, band, code):
    if topic == 'compose':
        return int(re.search(r'N: "(\d+)"', code)[1])
    if topic == 'docker' and band == 1:
        # The later run command overrides N; the exercise input is ARG BASE.
        return int(re.search(r'ARG BASE=(\d+)', code)[1])
    if topic == 'docker' and band == 2:
        return int(re.search(r'RUN echo \$\(\(\s*(\d+) \* 3', code)[1])
    match = re.search(r'\b[nN](?: As Integer)?\s*(?::=|=)\s*(\d+)', code)
    if match:
        return int(match[1])
    if topic in ('sql', 'mysql'):
        match = re.search(r'SELECT (\d+) \* 3|WHERE i < (\d+)', code)
        return int(next(x for x in match.groups() if x is not None))
    if topic == 'fastapi':
        return int(re.search(r'client.get\("/items/(\d+)"', code)[1])
    if topic == 'html':
        return int(re.search(r'(?:start|colspan)="(\d+)"', code)[1])
    if topic == 'css':
        width = int(re.search(r'(?:width|--base): (\d+)px', code)[1])
        return (width - (5 if band == 3 else 0)) // 10
    if topic in ('docker', 'compose'):
        match = re.search(r'BASE=(\d+)|N: "(\d+)"', code)
        return int(next(x for x in match.groups() if x is not None))
    if topic == 'rest':
        return int(re.search(r'(?:limit=|offset=|"value": |"amount": )(\d+)', code)[1])
    if topic == 'dynamodb':
        if band == 3:
            return int(re.search(r'Table has (\d+) items', code)[1]) // 10
        return int(re.search(r'score:\s*(\d+)', code)[1])
    raise ValueError(f'Cannot identify an input for {topic}/{band}')


def fib_by_paths(n):
    # Count tilings of length n with monomers and dimers: F(n+1).
    return sum(math.comb(n - pairs, pairs) for pairs in range(n // 2 + 1))


def pair_sum(n):
    values = list(range(1, n + 1))
    return (sum(values) ** 2 - sum(x ** 2 for x in values)) // 2


def same_parity_sum(n, include_zero=False):
    values = range(n) if include_zero else range(1, n + 1)
    groups = [[i for i in values if i % 2 == parity] for parity in (0, 1)]
    if include_zero:
        return sum(2 * len(group) * sum(group) for group in groups)
    # For each j, permitted i are j,j+2,...,n. This reverses the loop order.
    return sum(j * ((n - j) // 2 + 1) for j in values)


def git_reachable(n, band):
    graph = {'root': []}
    parent = 'root'
    for index in range(n):
        graph[f'm{index}'] = [parent]
        parent = f'm{index}'
    head = parent
    if band == 1:
        head = graph[head][0]
    elif band == 2:
        graph['side'] = [graph[head][0]]
        graph['merge'] = [head, 'side']
        head = 'merge'
    elif band == 3:
        graph['file'] = [head]
        graph['revert'] = ['file']
        head = 'revert'
    seen, stack = set(), [head]
    while stack:
        current = stack.pop()
        if current not in seen:
            seen.add(current)
            stack.extend(graph[current])
    return len(seen)


def expected(topic, band, n):
    ordinary = {'python','javascript','node','java','c','cpp','csharp','dotnet','php','haskell','sql','mysql','arduino'}
    if topic in ordinary:
        return [3*n+2, sum(i+i for i in range(1,n+1)), same_parity_sum(n), fib_by_paths(n)][band]
    if topic == 'react':
        if band == 0: return n+n
        if band == 1: return sum(range(1,n+1))
        state = n
        if band == 2:
            for _ in range(n-1): state += n
            return state-n
        for _ in range(2): state *= 2
        return state
    if topic == 'vue':
        if band == 0: return n+n
        if band == 1: return sum(range(1,n+1))
        state = n
        for _ in range(band-1): state += n
        doubled = state+state
        return state+state+state if band == 2 else doubled+state
    if topic == 'html': return [n+1, n+1, (n+5)-1, (n+4)-1][band]
    if topic == 'css':
        # Represent both horizontal sides explicitly.
        return [n*10+sum([2,2,1,1]), n*10-sum([3,3,2,2]), n*10*2+sum([4,4,2,2]), n*10+5+sum([2,2,1,1])][band]
    if topic == 'numpy':
        if band == 0: return sum(range(1,n+1))
        if band == 1: return sum(list(range(2*n))[1::2])
        if band == 2:
            arr = list(range(n))
            arr[1:] = [x+x for x in arr[1:]]
            return sum(arr)
        return same_parity_sum(n, True)
    if topic == 'opencv':
        if band == 0: return n+2
        if band == 1: return len([pixel for pixel in range(n) if pixel > n//2])
        if band == 2: return sum(2 for _ in range((n-1)*(n-1)))
        return (n-1)*(n-1)
    if topic in ('sqlalchemy','fastapi'):
        if band == 0: return n if topic == 'sqlalchemy' else n+n
        if band == 1: return sum(range(n//2+1,n+1)) if topic == 'sqlalchemy' else sum(range(1,n+1))
        if band == 2: return sum(x*x for x in range(2,n+1,2))
        return pair_sum(n)
    if topic == 'matlab':
        if band == 0: return sum(range(1,n+1))
        if band == 1: return sum(list(range(1,n*2+1))[n:])
        if band == 2:
            a = list(range(1,n+1)); b = [a[0]]+[x+x for x in a[1:]]
            return sum(a+b)
        return same_parity_sum(n, True)
    if topic == 'git': return git_reachable(n,band)
    if topic in ('docker','compose'):
        environment = n if band != 1 else n+2
        if band == 0: return environment+environment
        if band == 1: return environment+5
        if band == 2:
            artifact = sum([environment]*3)
            return artifact+2
        args=[4,5]
        return environment*args[0]+args[1]
    if topic == 'rest':
        if band == 0: return n
        if band == 1: return len(list(range(100))[n:n+5])
        state=0;seen=set()
        for _ in range(3):
            if band == 2: state=n
            elif 'quiz' not in seen: state+=n;seen.add('quiz')
        return state
    if topic == 'dynamodb':
        if band == 0: return n
        if band == 1: return n+5
        if band == 2:
            score,version=n,2
            for _ in range(2):
                if version == 2: score+=n;version=3
            return score
        byte_count=sum(1024 for _ in range(n*10))
        return Fraction((byte_count+4095)//4096,2)
    if topic == 'wireshark':
        packets=[{'even':i%2==0,'third':i%3==0} for i in range(1,n+1)]
        if band == 0: return n
        if band == 1: return sum(p['even'] for p in packets)
        if band == 2: return sum(p['even'] and p['third'] for p in packets)
        return sum(p['even'] != p['third'] for p in packets)
    if topic == 'openssl':
        if band == 0: return len(bytes(n).hex())
        if band == 1: return hashlib.sha256(bytes(n)).digest_size
        if band == 2:
            import base64
            return len(base64.b64encode(hashlib.sha512(bytes(n)).digest()))
        padding=16-n%16
        return n+padding
    if topic == 'inventor':
        return [n+n, sum(i+i for i in range(1,n+1)),sum([n+n]*(n+1)),fib_by_paths(n)][band]
    if topic == 'cad':
        if band == 0: return sum([2*n]*3)
        if band == 1: return sum([(n+2)*n]*3)
        if band == 2:
            outer=2*n;inner=outer-2
            return sum(1 for i in range(outer) for j in range(outer) if not (1<=i<outer-1 and 1<=j<outer-1))
        return same_parity_sum(n)
    if topic == 'cfd':
        if band == 0: return n+n
        if band == 1: return sum([n]*3)-n
        if band == 2: return Fraction(2*n*n,2)
        pressures=[n*10,n*10+4,n*10+5]
        estimate=pressures[2]+Fraction(pressures[2]-pressures[1],2**2-1)
        return estimate*3
    if topic == 'simulink':
        if band == 0: return sum([n]*3)
        if band == 1: return sum([n+2]*3)
        if band == 2:
            state=0
            for _ in range(n):state+=2
            return state
        return fib_by_paths(n)
    raise ValueError(f'Unrecognized topic: {topic}')


def code_for(q):
    return q['solution'] if q['type'] in ('complete','create') else q['code']


if __name__ == '__main__':
    records=json.load(sys.stdin)
    results=[]
    for q in records:
        if q['type']=='theory':continue
        try:
            band=['Easy','Medium','Hard','Very hard'].index(q['level'])
            code=code_for(q);n=infer_input(q['topic'],band,code)
            if q['type'] in ('create','complete','logic'):
                assert not q.get('assumption','').startswith('Report the final numeric output only'), 'Answer-format instructions contradict this format'
            if q['topic']=='wireshark' and q['type']=='create':
                assert q.get('contextCode') and f'n={n}' in q['contextCode'], 'Creation task omits the packet dataset'
                assert '# Display filter:' not in q['contextCode'], 'Dataset context must not reveal the filter answer'
            value=expected(q['topic'],band,n)
            assert 3<=n<=12, f'Unexpected input {n}'
            assert float(value)==q['expectedValue'], f'Independent result {value}; stored expectedValue {q["expectedValue"]}'
            if q['type']=='logic':
                n_b=infer_input(q['topic'],band,q['compareCode'])
                value_b=expected(q['topic'],band,n_b)
                assert n_b==n+1
                assert float(value_b-value)==float(q['answer']), 'Difference answer is incorrect'
                assert f'A produces {q["expectedValue"]}.' in q['explanation']
                assert f'B produces {float(value_b):g}.' in q['explanation']
            elif q['type']=='output':assert float(value)==float(q['answer'])
            elif q['type']=='complete':
                assert q['code'].count('___')==1
                assert q['code'].replace('___',q['answer'],1)==q['solution'], 'Completion does not reconstruct solution'
            else:assert any(str(float(value)).removesuffix('.0') in line for line in q['rubric']), 'Rubric omits expected output'
            result={'id':q['id'],'status':'passed','input':n,'independentResult':float(value),'method':'Separate Python numerical/contract oracle reading stored records'}
            if q['type']=='logic':result['comparisonResult']=float(value_b)
            results.append(result)
        except Exception as exc:
            results.append({'id':q['id'],'status':'failed','detail':str(exc)})
    json.dump(results,sys.stdout)
